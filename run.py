import os
import sys
import subprocess
import time
import shutil

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(root_dir, "backend")
    frontend_dir = os.path.join(root_dir, "frontend")

    print("==================================================")
    print("      Slooze Food Ordering App Orchestrator      ")
    print("==================================================")

    # 1. Setup Python Virtual Environment in Backend
    venv_dir = os.path.join(backend_dir, ".venv")
    if os.name == "nt":
        python_exe = os.path.join(venv_dir, "Scripts", "python.exe")
        pip_exe = os.path.join(venv_dir, "Scripts", "pip.exe")
        uvicorn_exe = os.path.join(venv_dir, "Scripts", "uvicorn.exe")
    else:
        python_exe = os.path.join(venv_dir, "bin", "python")
        pip_exe = os.path.join(venv_dir, "bin", "pip")
        uvicorn_exe = os.path.join(venv_dir, "bin", "uvicorn")

    if not os.path.exists(venv_dir):
        print(f"Creating virtual environment in {venv_dir}...")
        subprocess.run([sys.executable, "-m", "venv", venv_dir], check=True)
    else:
        print("Python virtual environment already exists.")

    # 2. Upgrade pip and install backend requirements
    print("Installing backend dependencies...")
    subprocess.run([python_exe, "-m", "pip", "install", "--upgrade", "pip"], check=True)
    subprocess.run([python_exe, "-m", "pip", "install", "-r", os.path.join(backend_dir, "requirements.txt")], check=True)

    # 3. Check frontend dependencies
    print("Checking frontend node_modules...")
    node_modules_dir = os.path.join(frontend_dir, "node_modules")
    if not os.path.exists(node_modules_dir):
        print("Frontend dependencies not found. Running npm install...")
        npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
        subprocess.run([npm_cmd, "install"], cwd=frontend_dir, check=True)
    else:
        print("Frontend node_modules already installed.")

    # 4. Run Backend and Frontend Concurrently
    print("\nStarting servers...")
    processes = []
    try:
        # Start backend
        print("-> Starting FastAPI backend on http://localhost:8000")
        backend_env = os.environ.copy()
        # Ensure pythonpath includes the root directory so 'backend.main' can be resolved
        backend_env["PYTHONPATH"] = root_dir
        
        backend_proc = subprocess.Popen(
            [uvicorn_exe, "backend.main:app", "--host", "127.0.0.1", "--port", "8000", "--reload"],
            cwd=root_dir,
            env=backend_env
        )
        processes.append(backend_proc)

        # Start frontend
        print("-> Starting Next.js frontend dev server on http://localhost:3000")
        npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
        frontend_proc = subprocess.Popen(
            [npm_cmd, "run", "dev"],
            cwd=frontend_dir
        )
        processes.append(frontend_proc)

        print("\nBoth servers are running!")
        print("- Backend URL: http://localhost:8000/graphql (GraphQL Playground)")
        print("- Frontend URL: http://localhost:3000 (Next.js App UI)")
        print("\nPress Ctrl+C to stop both servers.")
        
        while True:
            time.sleep(1)
            # Check if any process has exited prematurely
            for p in processes:
                if p.poll() is not None:
                    raise Exception(f"Process {p.pid} terminated with exit code {p.returncode}")

    except KeyboardInterrupt:
        print("\nShutting down servers...")
    except Exception as e:
        print(f"\nError occurred: {e}")
        print("Shutting down servers...")
    finally:
        for p in processes:
            if p.poll() is None:
                print(f"Terminating process {p.pid}...")
                p.terminate()
                try:
                    p.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    print(f"Force killing process {p.pid}...")
                    p.kill()
        print("Servers stopped. Goodbye!")

if __name__ == "__main__":
    main()
