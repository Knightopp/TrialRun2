import os
import json
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from http.server import BaseHTTPRequestHandler

app_password = os.environ.get("GMAIL_APP_PASSWORD")
gmail_account = os.environ.get("GMAIL_ACCOUNT", "famgatewayin@gmail.com")

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            body = json.loads(post_data.decode('utf-8'))
            
            to_email = body.get("to")
            subject = body.get("subject")
            html_content = body.get("html")
            
            if not to_email or not subject or not html_content:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Missing parameters"}).encode())
                return
                
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"Srishti Registration <{gmail_account}>"
            msg["To"] = to_email
            
            msg.attach(MIMEText(html_content, "html"))
            
            with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
                server.login(gmail_account, app_password)
                server.sendmail(gmail_account, to_email, msg.as_string())
                
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True}).encode())
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def do_OPTIONS(self):
        self.send_response(200, "ok")
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header("Access-Control-Allow-Headers", "X-Requested-With, Content-type")
        self.end_headers()
