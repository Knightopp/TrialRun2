from http.server import BaseHTTPRequestHandler
import json
import os
import re
from datetime import datetime
from imap_tools import MailBox, AND

# Retrieve the app password and email from environment variables
app_password = os.environ.get("GMAIL_APP_PASSWORD")
gmail_account = os.environ.get("GMAIL_ACCOUNT", "famgatewayin@gmail.com")

if not app_password:
    raise Exception("GMAIL_APP_PASSWORD environment variable is not set")

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            body = json.loads(post_data.decode('utf-8'))
            
            amount = body.get("amount")
            
            if not amount:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "amount is required"}).encode())
                return
                
            expected_amount = float(amount)
            verified = False
            message = "Transaction not found"
            
            with MailBox("imap.gmail.com", 993).login(gmail_account, app_password, "INBOX") as mailbox:
                # Search for emails containing the exact amount
                for msg in mailbox.fetch(AND(text=str(expected_amount)), reverse=True, limit=20):
                    full_text = f"{msg.subject or ''} {msg.text or ''}".lower()
                    
                    # Ensure it's a credit email
                    if not any(kw in full_text for kw in ["received", "credited", "added"]):
                        continue
                        
                    # Check if it was received in the last 15 minutes
                    if msg.date:
                        now = datetime.now(msg.date.tzinfo)
                        diff = now - msg.date
                        if diff.total_seconds() > 900:
                            continue
                            
                    # Double check the amount matches exactly in the text
                    if str(expected_amount) in full_text:
                        verified = True
                        message = "Payment verified successfully!"
                        break
            
            # Respond to the frontend
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "verified": verified,
                "message": message
            }).encode())
            
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
