from http.server import BaseHTTPRequestHandler
import json
import os
import asyncio
from fampay_verify.models import FamPayVerifierConfig, GenerateQrParams
from fampay_verify import FamPayVerifier

# Retrieve the app password and email from environment variables
app_password = os.environ.get("GMAIL_APP_PASSWORD", "")
gmail_account = os.environ.get("GMAIL_ACCOUNT", "famgatewayin@gmail.com")
upi_id = os.environ.get("UPI_ID", "famgatewayin@fbl")

config = FamPayVerifierConfig(
    gmail=gmail_account,
    gmail_app_password=app_password
)
verifier = FamPayVerifier(config)

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            body = json.loads(post_data.decode('utf-8'))
            
            amount = body.get("amount")
            name = body.get("name", "Event Registration")
            
            if not amount:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "amount is required"}).encode())
                return
                
            # Generate the QR code using the fampay-verify package
            result = asyncio.run(verifier.generate_qr(GenerateQrParams(upi_id=upi_id, amount=amount, name=name)))
            
            # Respond to the frontend
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            
            response_data = {
                "qr_image": result.qr_image,
                "upi_uri": result.upi_uri
            }
                
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
