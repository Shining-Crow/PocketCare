import os
import time
from pathlib import Path
from typing import Optional

import pytest
from dotenv import load_dotenv
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.common.exceptions import ElementClickInterceptedException
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait


DEFAULT_WAIT_SECONDS = 15

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


def _safe_click(driver, el) -> None:
    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", el)
    try:
        el.click()
    except ElementClickInterceptedException:
        driver.execute_script("arguments[0].click();", el)


def _set_textarea_by_name(driver, name: str, value: str) -> None:
    w = _wait(driver)
    el = w.until(EC.presence_of_element_located((By.CSS_SELECTOR, f"textarea[name='{name}']")))
    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", el)
    el = w.until(EC.element_to_be_clickable((By.CSS_SELECTOR, f"textarea[name='{name}']")))
    el.click()
    el.send_keys(Keys.COMMAND, "a")
    el.send_keys(Keys.BACKSPACE)
    el.send_keys(value)


def login_doctor(driver, base_url: str, *, email: str, password: str) -> None:
    _open(driver, base_url, "/login")
    w = _wait(driver)

    w.until(EC.visibility_of_element_located((By.ID, "email")))

    # pick doctor role
    w.until(EC.element_to_be_clickable((By.XPATH, "//button[normalize-space()='Doctor']"))).click()

    email_el = driver.find_element(By.ID, "email")
    email_el.clear()
    email_el.send_keys(email)

    pass_el = driver.find_element(By.ID, "password")
    pass_el.clear()
    pass_el.send_keys(password)

    driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
    w.until(lambda d: "/dashboard" in d.current_url)


def test_doctor_profile_edit_updates_bio(driver):
    base_url = os.getenv("POCKETCARE_BASE_URL", "http://localhost:3000")
    email = _env("POCKETCARE_TEST_DOCTOR_EMAIL")
    password = _env("POCKETCARE_TEST_DOCTOR_PASSWORD")

    login_doctor(driver, base_url, email=email, password=password)

    # Ensure we're on doctor dashboard
    _open(driver, base_url, "/dashboard")
    w = _wait(driver)

    # Click Edit in Professional Profile
    edit_btn = w.until(
        EC.element_to_be_clickable(
            (By.XPATH, "//h2[contains(normalize-space(), 'Professional Profile')]/ancestor::div[contains(@class,'bg-white')]//button[.//span[normalize-space()='Edit']]" )
        )
    )
    _safe_click(driver, edit_btn)

    # Bio textarea should appear in edit mode
    w.until(EC.presence_of_element_located((By.CSS_SELECTOR, "textarea[name='bio']")))

    new_bio = f"Selenium bio update {int(time.time())}"
    _set_textarea_by_name(driver, "bio", new_bio)

    # Click Save
    save_btn = w.until(
        EC.element_to_be_clickable(
            (By.XPATH, "//button[.//span[normalize-space()='Save']]" )
        )
    )
    _safe_click(driver, save_btn)

    # Accept the success alert
    alert = w.until(EC.alert_is_present())
    alert_text = alert.text
    alert.accept()

    # Basic sanity: should not be a failure alert
    assert "failed" not in (alert_text or "").lower()

    # After save, edit mode closes and bio is rendered as a <p>
    w.until(EC.invisibility_of_element_located((By.CSS_SELECTOR, "textarea[name='bio']")))

    # Verify new bio shows up somewhere on the page
    w.until(lambda d: new_bio in d.page_source)

    # Optional: refresh and ensure it persisted
    driver.refresh()
    w.until(lambda d: "/dashboard" in d.current_url)
    w.until(lambda d: new_bio in d.page_source)
