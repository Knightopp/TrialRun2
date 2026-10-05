import json
import os
import urllib.request
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler

# In-memory recent logs cache (retained across warm serverless invocations)
_RECENT_LOGS = []
MAX_CACHED_LOGS = 200

def require_admin(headers):
    """Verify the Supabase JWT and require its linked active admin profile."""
    authorization = headers.get('Authorization', '')
    if not authorization.startswith('Bearer '):
        return None
    access_token = authorization[7:].strip()
    supabase_url = os.environ.get('SUPABASE_URL')
    publishable_key = os.environ.get('SUPABASE_ANON_KEY') or os.environ.get('VITE_SUPABASE_ANON_KEY')
    if not access_token or not supabase_url or not publishable_key:
        return None
    try:
        user_req = urllib.request.Request(
            f"{supabase_url}/auth/v1/user",
            headers={'apikey': publishable_key, 'Authorization': f'Bearer {access_token}'},
            method='GET'
        )
        with urllib.request.urlopen(user_req, timeout=3.0) as resp:
            user = json.loads(resp.read().decode('utf-8'))
        user_id = user.get('id')
        if not user_id:
            return None
        profile_req = urllib.request.Request(
            f"{supabase_url}/rest/v1/volunteers?auth_user_id=eq.{user_id}&role=eq.admin&status=eq.active&select=id",
            headers={'apikey': publishable_key, 'Authorization': f'Bearer {access_token}'},
            method='GET'
        )
        with urllib.request.urlopen(profile_req, timeout=3.0) as resp:
            profiles = json.loads(resp.read().decode('utf-8'))
        if profiles:
            return user.get('email') or ''
    except Exception:
        pass
    return None

def get_client_ip(headers, client_address):
    """Extract real client IP from reverse proxy and CDN headers."""
    candidates = [
        headers.get('cf-connecting-ip'),
        headers.get('true-client-ip'),
        headers.get('x-real-ip'),
        headers.get('x-forwarded-for')
    ]
    for c in candidates:
        if c:
            first_ip = c.split(',')[0].strip()
            if first_ip and first_ip != '127.0.0.1' and first_ip != '::1':
                return first_ip
    
    if client_address and len(client_address) > 0:
        return client_address[0]
    return '127.0.0.1'

def is_private_ip(ip):
    if not ip:
        return True
    ip = ip.strip()
    return (
        ip.startswith('127.') or
        ip.startswith('10.') or
        ip.startswith('192.168.') or
        ip.startswith('172.16.') or ip.startswith('172.17.') or
        ip.startswith('172.18.') or ip.startswith('172.19.') or
        ip.startswith('172.20.') or ip.startswith('172.21.') or
        ip.startswith('172.22.') or ip.startswith('172.23.') or
        ip.startswith('172.24.') or ip.startswith('172.25.') or
        ip.startswith('172.26.') or ip.startswith('172.27.') or
        ip.startswith('172.28.') or ip.startswith('172.29.') or
        ip.startswith('172.30.') or ip.startswith('172.31.') or
        ip == '::1' or ip == 'localhost'
    )

def lookup_ip_geolocation(ip, headers):
    """Resolve geographic location with high accuracy using ipwho.is with fallback."""
    geo = {
        'city': headers.get('x-vercel-ip-city') or 'Unknown City',
        'region': headers.get('x-vercel-ip-country-region') or 'Unknown Region',
        'country': headers.get('x-vercel-ip-country') or 'Unknown Country',
        'latitude': None,
        'longitude': None,
        'postal': '',
        'timezone': headers.get('x-vercel-ip-timezone') or 'UTC',
        'isp': 'Internet Service Provider',
        'org': '',
        'asn': '',
        'ip': ip
    }

    v_lat = headers.get('x-vercel-ip-latitude')
    v_lon = headers.get('x-vercel-ip-longitude')
    if v_lat and v_lon:
        try:
            geo['latitude'] = float(v_lat)
            geo['longitude'] = float(v_lon)
        except Exception:
            pass

    if not is_private_ip(ip):
        try:
            req = urllib.request.Request(
                f"https://ipwho.is/{ip}",
                headers={'User-Agent': 'Srishti-Tracker/2.7', 'Accept': 'application/json'}
            )
            with urllib.request.urlopen(req, timeout=3.0) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                if data.get('success') is not False:
                    geo['city'] = data.get('city') or geo['city']
                    geo['region'] = data.get('region') or geo['region']
                    geo['country'] = data.get('country') or geo['country']
                    geo['postal'] = data.get('postal') or ''
                    if isinstance(data.get('latitude'), (int, float)):
                        geo['latitude'] = data.get('latitude')
                    if isinstance(data.get('longitude'), (int, float)):
                        geo['longitude'] = data.get('longitude')
                    
                    conn = data.get('connection') or {}
                    geo['isp'] = conn.get('isp') or conn.get('org') or geo['isp']
                    geo['org'] = conn.get('org') or ''
                    geo['asn'] = f"AS{conn.get('asn')}" if conn.get('asn') else ''
                    
                    tz = data.get('timezone') or {}
                    geo['timezone'] = tz.get('id') or geo['timezone']
        except Exception as e:
            # Fallback to ip-api
            try:
                req2 = urllib.request.Request(
                    f"http://ip-api.com/json/{ip}?fields=status,country,regionName,city,lat,lon,timezone,isp,zip",
                    headers={'User-Agent': 'Srishti-Tracker/2.7'}
                )
                with urllib.request.urlopen(req2, timeout=2.0) as resp2:
                    data2 = json.loads(resp2.read().decode('utf-8'))
                    if data2.get('status') == 'success':
                        geo['city'] = data2.get('city') or geo['city']
                        geo['region'] = data2.get('regionName') or geo['region']
                        geo['country'] = data2.get('country') or geo['country']
                        geo['postal'] = data2.get('zip') or ''
                        geo['latitude'] = data2.get('lat')
                        geo['longitude'] = data2.get('lon')
                        geo['isp'] = data2.get('isp') or geo['isp']
            except Exception:
                pass

    return geo

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200, "ok")
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
        self.end_headers()

    def do_GET(self):
        """Never expose the in-memory audit cache through a public endpoint."""
        self.send_response(405)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({"error": "Method not allowed"}).encode('utf-8'))

    def do_POST(self):
        try:
            authenticated_email = require_admin(self.headers)
            if authenticated_email is None:
                self.send_response(403)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Active administrator sign-in required"}).encode('utf-8'))
                return

            content_length = int(self.headers.get('Content-Length', 0))
            if content_length <= 0 or content_length > 16384:
                self.send_error(413, "Request body too large or empty")
                return
            post_data = self.rfile.read(content_length)
            body = json.loads(post_data.decode('utf-8')) if post_data else {}

            client_ip = get_client_ip(self.headers, self.client_address)
            geo = lookup_ip_geolocation(client_ip, self.headers)

            gps = body.get('gps_location') or {}
            has_gps = gps.get('latitude') is not None and gps.get('longitude') is not None

            final_lat = gps.get('latitude') if has_gps else geo.get('latitude')
            final_lon = gps.get('longitude') if has_gps else geo.get('longitude')
            location_source = 'high_precision_gps' if has_gps else 'network_ip_geoip'
            accuracy_meters = gps.get('accuracy') if has_gps else (5000 if final_lat else None)

            maps_url = ""
            if final_lat is not None and final_lon is not None:
                maps_url = f"https://www.google.com/maps?q={final_lat},{final_lon}&z=17"

            log_entry = {
                "id": f"log_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}_{os.urandom(3).hex()}",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "action": body.get("action", "USER_ACTIVITY"),
                "status": body.get("status", "SUCCESS"),
                "user_email": authenticated_email.lower().strip(),
                "participant_code": body.get("participant_code") or "N/A",
                "participant_name": body.get("name") or body.get("participant_name") or "Attendee",
                "client_ip": client_ip,
                "city": geo.get("city"),
                "region": geo.get("region"),
                "country": geo.get("country"),
                "postal": geo.get("postal"),
                "isp": geo.get("isp"),
                "latitude": final_lat,
                "longitude": final_lon,
                "accuracy_meters": accuracy_meters,
                "location_source": location_source,
                "maps_url": maps_url,
                "device": body.get("device") or {},
                "user_agent": self.headers.get("user-agent", "Unknown"),
                "metadata": body.get("metadata") or {}
            }

            _RECENT_LOGS.append(log_entry)
            if len(_RECENT_LOGS) > MAX_CACHED_LOGS:
                _RECENT_LOGS.pop(0)

            # Persist to Supabase public.audit_logs if accessible
            supabase_url = os.environ.get("SUPABASE_URL")
            supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
            
            if supabase_url and supabase_key:
                try:
                    db_payload = {
                        "action": log_entry["action"],
                        "user_email": log_entry["user_email"],
                        "participant_code": log_entry["participant_code"],
                        "participant_name": log_entry["participant_name"],
                        "client_ip": log_entry["client_ip"],
                        "city": log_entry["city"],
                        "region": log_entry["region"],
                        "country": log_entry["country"],
                        "isp": log_entry["isp"],
                        "latitude": log_entry["latitude"],
                        "longitude": log_entry["longitude"],
                        "accuracy_meters": log_entry["accuracy_meters"],
                        "location_source": log_entry["location_source"],
                        "maps_url": log_entry["maps_url"],
                        "user_agent": log_entry["user_agent"],
                        "metadata": log_entry["metadata"]
                    }
                    req = urllib.request.Request(
                        f"{supabase_url}/rest/v1/audit_logs",
                        data=json.dumps(db_payload).encode('utf-8'),
                        headers={
                            'apikey': supabase_key,
                            'Authorization': f"Bearer {supabase_key}",
                            'Content-Type': 'application/json',
                            'Prefer': 'return=minimal'
                        },
                        method='POST'
                    )
                    with urllib.request.urlopen(req, timeout=1.8):
                        pass
                except Exception:
                    pass

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": True,
                "message": "Activity and location logged successfully",
                "log": log_entry
            }).encode('utf-8'))

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode('utf-8'))
