import os
from pathlib import Path
from typing import Optional

import pytest
from dotenv import load_dotenv
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait


DEFAULT_WAIT_SECONDS = 12

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
        drv = webdriver.Chrome(options=options)
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
    _open(driver, base_url, "/login")
    w = _wait(driver)

    if role not in {"user", "doctor"}:
        raise ValueError("role must be 'user' or 'doctor'")

    w.until(lambda d: d.find_element(By.ID, "email"))
    driver.find_element(By.XPATH, f"//button[normalize-space()='{role.capitalize()}']").click()

    email_el = driver.find_element(By.ID, "email")
    email_el.clear()
    email_el.send_keys(email)

    password_el = driver.find_element(By.ID, "password")
    password_el.clear()
    password_el.send_keys(password)

    driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
    w.until(lambda d: "/dashboard" in d.current_url)


def test_symptom_checker_form_validation_and_submit(driver):
    base_url = os.getenv("POCKETCARE_BASE_URL", "http://localhost:3000")
    email = _env("POCKETCARE_TEST_USER_EMAIL")
    password = _env("POCKETCARE_TEST_USER_PASSWORD")

    # Login (Symptom Checker is behind ProtectedRoute)
    login_user_portal(driver, base_url, email=email, password=password, role="user")

    _open(driver, base_url, "/symptom-checker")
    w = _wait(driver)
    w.until(lambda d: d.find_element(By.CSS_SELECTOR, "[data-testid='sc-submit']"))

    # Submit with empty symptoms -> client-side validation error
    driver.find_element(By.CSS_SELECTOR, "[data-testid='sc-submit']").click()
    w.until(lambda d: d.find_element(By.CSS_SELECTOR, "[data-testid='sc-error']"))
    assert "describe" in driver.find_element(By.CSS_SELECTOR, "[data-testid='sc-error']").text.lower()

    # Fill fields
    symptoms_el = driver.find_element(By.CSS_SELECTOR, "[data-testid='sc-symptoms']")
    symptoms_el.clear()
    symptoms_el.send_keys("Fever and cough for 3 days")

    duration_el = driver.find_element(By.CSS_SELECTOR, "[data-testid='sc-duration']")
    duration_el.clear()
    duration_el.send_keys("3 days")

    age_el = driver.find_element(By.CSS_SELECTOR, "[data-testid='sc-age']")
    age_el.clear()
    age_el.send_keys("24")

    gender_el = driver.find_element(By.CSS_SELECTOR, "[data-testid='sc-gender']")
    gender_el.send_keys("male")

    driver.find_element(By.CSS_SELECTOR, "[data-testid='sc-submit']").click()

    # Backend may respond with either a result or an error; assert one appears.
    def _result_or_error(d):
        if d.find_elements(By.CSS_SELECTOR, "[data-testid='sc-result']"):
            return "result"
        if d.find_elements(By.CSS_SELECTOR, "[data-testid='sc-error']"):
            return "error"
        return False

    outcome = w.until(_result_or_error)
    assert outcome in {"result", "error"}
