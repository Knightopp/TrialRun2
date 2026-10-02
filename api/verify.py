from http.server import BaseHTTPRequestHandler
import json
import os
from fampay_verify import FamPayVerifier, VerifyPaymentParams

# Retrieve the app password and email from environment variables
# You can set this in your Vercel project settings under Environment Variables
app_password = os.environ.get("GMAIL_APP_PASSWORD")
gmail_account = os.environ.get("GMAIL_ACCOUNT", "famgatewayin@gmail.com")

if not app_password:
    raise Exception("GMAIL_APP_PASSWORD environment variable is not set")

verifier = FamPayVerifier({
    "gmail": gmail_account,
    "gmail_app_password": app_password
})

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            body = json.loads(post_data.decode('utf-8'))
            
            amount = body.get("amount")
            utr = body.get("utr")
            
            if not amount or not utr:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "amount and utr are required"}).encode())
                return
                
            # Verify the payment using the fampay-verify package
            result = verifier.verify_payment(VerifyPaymentParams(amount=amount, utr=utr))
            
            # Respond to the frontend
            self.send_response(200 if result.verified else 400)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            
            response_data = {
                "verified": result.verified,
                "message": result.message,
            }
            if hasattr(result, "utr"):
                response_data["utr"] = getattr(result, "utr")
                
            self.wfile.write(json.dumps(response_data).encode())
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    # Handle CORS for local development and preflight requests
    def do_OPTIONS(self):
        self.send_response(200, "ok")
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header("Access-Control-Allow-Headers", "X-Requested-With, Content-type")
        self.end_headers()
