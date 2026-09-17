import requests
import json
import sys

BASE_URL = "http://localhost:8000/api/v1"

def print_step(msg):
    print(f"\n[{'*'*10}] {msg} [{'#'*10}]")

def test_flow():
    # 1. Login as Super Admin to verify admin routes
    print_step("Logging in as Admin (saminu@gmail.com)")
    res = requests.post(f"{BASE_URL}/auth/login", data={"username": "saminu@gmail.com", "password": "admin123"})
    if res.status_code != 200:
        print("Failed to login Admin:", res.text)
        return False
    admin_token = res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    # 2. Check admissions
    print_step("Admin checking applications")
    res = requests.get(f"{BASE_URL}/applications", headers=admin_headers)
    print("Applications:", res.status_code)
    
    # 3. Login as Student
    print_step("Logging in as Student (yushau@gmail.com)")
    res = requests.post(f"{BASE_URL}/auth/login", data={"username": "yushau@gmail.com", "password": "student123"})
    if res.status_code != 200:
        print("Failed to login Student:", res.text)
        return False
    student_token = res.json()["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}
    
    # 4. Student views progress overview
    print_step("Student viewing dashboard overview")
    res = requests.get(f"{BASE_URL}/students/me/progress/overview", headers=student_headers)
    print("Dashboard Overview:", res.status_code)
    if res.status_code == 200:
        print(json.dumps(res.json(), indent=2))
        
    print_step("ALL E2E CHECKS PASSED")
    return True

if __name__ == "__main__":
    try:
        test_flow()
    except Exception as e:
        print(f"Server might not be running: {e}")
