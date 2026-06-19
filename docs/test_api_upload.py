import urllib.request
import urllib.parse
import json
import mimetypes
import uuid

def main():
    print("Starting diagnostic upload...")
    
    # 1. Login
    login_url = "http://localhost:5000/api/v1/Auth/login"
    login_data = json.dumps({
        "username": "admin",
        "password": "admin123"
    }).encode("utf-8")
    
    req = urllib.request.Request(
        login_url,
        data=login_data,
        headers={"Content-Type": "application/json"}
    )
    
    try:
        with urllib.request.urlopen(req) as res:
            response_body = res.read().decode("utf-8")
            login_json = json.loads(response_body)
            # Find the token in the response
            print("Login response keys:", login_json.keys())
            token = login_json.get("token") or login_json.get("accessToken") or login_json.get("jwtToken")
            print("Login success, status:", res.status)
    except Exception as ex:
        print("Login failed:", ex)
        token = None

    # 2. Upload file
    upload_url = "http://localhost:5000/api/v1/admin/tests/catalog/import"
    file_path = r"d:\Projects\SynOS-Synthesized-Lab-Intelligence\docs\SynOS_Catalog_Migration_FINAL.xlsx"
    
    boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
    
    # Construct multipart request body
    body = []
    
    # Add form field ValidateOnly = true
    body.append(f"--{boundary}".encode("utf-8"))
    body.append('Content-Disposition: form-data; name="ValidateOnly"'.encode("utf-8"))
    body.append(''.encode("utf-8")) # empty line
    body.append('true'.encode("utf-8"))
    
    # Add file field
    body.append(f"--{boundary}".encode("utf-8"))
    body.append('Content-Disposition: form-data; name="File"; filename="SynOS_Catalog_Migration_FINAL.xlsx"'.encode("utf-8"))
    body.append('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'.encode("utf-8"))
    body.append(''.encode("utf-8")) # empty line
    
    # Read file bytes
    with open(file_path, "rb") as f:
        file_bytes = f.read()
    body.append(file_bytes)
    
    # Close boundary
    body.append(f"--{boundary}--".encode("utf-8"))
    body.append(''.encode("utf-8"))
    
    # Join parts with \r\n
    delim = b"\r\n"
    payload = delim.join(body)
    
    headers = {
        "Content-Type": f"multipart/form-data; boundary={boundary}",
        "Content-Length": str(len(payload))
    }
    
    if token:
        headers["Authorization"] = f"Bearer {token}"
        
    req_upload = urllib.request.Request(
        upload_url,
        data=payload,
        headers=headers,
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req_upload) as res:
            print("Upload success, status:", res.status)
            print("Response:", res.read().decode("utf-8")[:3000])
    except urllib.error.HTTPError as ex:
        print("Upload failed, HTTP status:", ex.code)
        print("Response Error Body:", ex.read().decode("utf-8")[:3000])
    except Exception as ex:
        print("Upload failed, general exception:", ex)

if __name__ == "__main__":
    main()
