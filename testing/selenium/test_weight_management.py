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


def test_weight_management_add_entry_and_goal(driver):
    base_url = os.getenv("POCKETCARE_BASE_URL", "http://localhost:3000")
    email = _env("POCKETCARE_TEST_USER_EMAIL")
    password = _env("POCKETCARE_TEST_USER_PASSWORD")

    # Login (required because /weight-management is behind ProtectedRoute)
    login_user_portal(driver, base_url, email=email, password=password, role="user")

    # Navigate to Weight Management
    _open(driver, base_url, "/weight-management")
    w = _wait(driver)
    w.until(lambda d: d.find_element(By.CSS_SELECTOR, "[data-testid='wm-entry-weight']"))

    # Fill Add Entry form
    driver.find_element(By.CSS_SELECTOR, "[data-testid='wm-entry-age']").clear()
    driver.find_element(By.CSS_SELECTOR, "[data-testid='wm-entry-age']").send_keys("30")

    driver.find_element(By.CSS_SELECTOR, "[data-testid='wm-entry-weight']").clear()
    driver.find_element(By.CSS_SELECTOR, "[data-testid='wm-entry-weight']").send_keys("70")

    driver.find_element(By.CSS_SELECTOR, "[data-testid='wm-entry-height']").clear()
    driver.find_element(By.CSS_SELECTOR, "[data-testid='wm-entry-height']").send_keys("175")

    # BMI preview should update to a number (not just —)
    w.until(lambda d: d.find_element(By.CSS_SELECTOR, "[data-testid='wm-bmi-preview']").text.strip() != "—")

    driver.find_element(By.CSS_SELECTOR, "[data-testid='wm-save-entry']").click()

    # Latest weight card should reflect the new entry
    w.until(lambda d: "70" in d.find_element(By.CSS_SELECTOR, "[data-testid='wm-latest-weight']").text)

    # Fill Goal form
    driver.find_element(By.CSS_SELECTOR, "[data-testid='wm-goal-target-weight']").clear()
    driver.find_element(By.CSS_SELECTOR, "[data-testid='wm-goal-target-weight']").send_keys("65")

    driver.find_element(By.CSS_SELECTOR, "[data-testid='wm-set-goal']").click()

    # Active goal banner should be visible.
    w.until(lambda d: d.find_element(By.CSS_SELECTOR, "[data-testid='wm-active-goal']"))
    w.until(
        lambda d: d.find_element(By.CSS_SELECTOR, "[data-testid='wm-goal-target-weight']").get_attribute("value")
        == ""
    )
