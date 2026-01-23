import os
from pathlib import Path
from typing import Optional

import pytest
from dotenv import load_dotenv
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


DEFAULT_WAIT_SECONDS = 12

# Automatically load credentials/settings for local runs.
# - Primary: testing/selenium/.env (next to this test file)
# - Fallback: repo-root .env (if present)
# Environment variables already set in the shell take precedence (override=False).
_THIS_DIR = Path(__file__).resolve().parent
load_dotenv(dotenv_path=_THIS_DIR / ".env", override=False)
load_dotenv(dotenv_path=_THIS_DIR.parent.parent / ".env", override=False)


def _env(name: str, default: Optional[str] = None) -> str:
    value = os.getenv(name)
    if value is None or value == "":
        if default is None:
            raise RuntimeError(f"Missing required env var: {name}")
        return default
    return value


@pytest.fixture
def driver():
    browser = os.getenv("SELENIUM_BROWSER", "chrome").lower()
    headless = os.getenv("SELENIUM_HEADLESS", "1") == "1"

    if browser == "chrome":
        options = webdriver.ChromeOptions()
        if headless:
            options.add_argument("--headless=new")
        options.add_argument("--window-size=1280,900")
        options.add_argument("--disable-gpu")
        options.add_argument("--no-sandbox")
        drv = webdriver.Chrome(options=options)  # Selenium Manager auto-resolves driver
    elif browser == "firefox":
        options = webdriver.FirefoxOptions()
        if headless:
            options.add_argument("-headless")
        drv = webdriver.Firefox(options=options)
        drv.set_window_size(1280, 900)
    else:
        raise RuntimeError(f"Unsupported SELENIUM_BROWSER: {browser}")

    try:
        yield drv
    finally:
        drv.quit()


def _wait(driver, seconds: int = DEFAULT_WAIT_SECONDS) -> WebDriverWait:
    return WebDriverWait(driver, seconds)


def _open(driver, base_url: str, path: str) -> None:
    base = base_url.rstrip("/")
    driver.get(f"{base}{path}")


def login_user_portal(driver, base_url: str, *, email: str, password: str, role: str = "user") -> None:
    """Logs in via /login. On success, UI navigates to /dashboard."""
    _open(driver, base_url, "/login")

    w = _wait(driver)

    if role not in {"user", "doctor"}:
        raise ValueError("role must be 'user' or 'doctor'")

    w.until(EC.element_to_be_clickable((By.XPATH, f"//button[normalize-space()='{role.capitalize()}']"))).click()

    email_el = w.until(EC.visibility_of_element_located((By.ID, "email")))
    email_el.clear()
    email_el.send_keys(email)

    password_el = driver.find_element(By.ID, "password")
    password_el.clear()
    password_el.send_keys(password)

    driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()

    w.until(lambda d: "/dashboard" in d.current_url)


def login_admin_portal(driver, base_url: str, *, email: str, password: str) -> None:
    """Logs in via /admin/login. On success, UI navigates to /admin/dashboard."""
    _open(driver, base_url, "/admin/login")

    w = _wait(driver)

    email_el = w.until(EC.visibility_of_element_located((By.CSS_SELECTOR, "input[type='email']")))
    email_el.clear()
    email_el.send_keys(email)

    password_el = driver.find_element(By.CSS_SELECTOR, "input[type='password']")
    password_el.clear()
    password_el.send_keys(password)

    driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()

    w.until(lambda d: "/admin/dashboard" in d.current_url)


def login_hospital_portal(driver, base_url: str, *, email: str, password: str) -> None:
    """Logs in via /hospital/login. On success, UI navigates to /hospital/dashboard."""
    _open(driver, base_url, "/hospital/login")

    w = _wait(driver)

    email_el = w.until(EC.visibility_of_element_located((By.CSS_SELECTOR, "input[type='email']")))
    email_el.clear()
    email_el.send_keys(email)

    password_el = driver.find_element(By.CSS_SELECTOR, "input[type='password']")
    password_el.clear()
    password_el.send_keys(password)

    driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()

    w.until(lambda d: "/hospital/dashboard" in d.current_url)


def test_user_login_redirects_to_dashboard(driver):
    base_url = os.getenv("POCKETCARE_BASE_URL", "http://localhost:3000")
    email = _env("POCKETCARE_TEST_USER_EMAIL")
    password = _env("POCKETCARE_TEST_USER_PASSWORD")

    login_user_portal(driver, base_url, email=email, password=password, role="user")
    assert "/dashboard" in driver.current_url


def test_doctor_login_redirects_to_dashboard(driver):
    base_url = os.getenv("POCKETCARE_BASE_URL", "http://localhost:3000")
    email = _env("POCKETCARE_TEST_DOCTOR_EMAIL")
    password = _env("POCKETCARE_TEST_DOCTOR_PASSWORD")

    login_user_portal(driver, base_url, email=email, password=password, role="doctor")
    assert "/dashboard" in driver.current_url


def test_admin_login_redirects_to_admin_dashboard(driver):
    base_url = os.getenv("POCKETCARE_BASE_URL", "http://localhost:3000")
    email = _env("POCKETCARE_TEST_ADMIN_EMAIL")
    password = _env("POCKETCARE_TEST_ADMIN_PASSWORD")

    login_admin_portal(driver, base_url, email=email, password=password)
    assert "/admin/dashboard" in driver.current_url


def test_hospital_login_redirects_to_hospital_dashboard(driver):
    base_url = os.getenv("POCKETCARE_BASE_URL", "http://localhost:3000")
    email = _env("POCKETCARE_TEST_HOSPITAL_EMAIL")
    password = _env("POCKETCARE_TEST_HOSPITAL_PASSWORD")

    login_hospital_portal(driver, base_url, email=email, password=password)
    assert "/hospital/dashboard" in driver.current_url
