# PocketCare

AI-assisted mobile-first health platform for symptom analysis and medical service connectivity.

## Project Structure

```
PocketCare/
├── backend/            # Flask API
├── frontend/           # React application
├── database/           # SQL schemas and seed data
└── PROJECT_PLAN.txt   # Detailed project roadmap
```

## Quick Start

### Backend Setup

1. Install Python dependencies:

```bash
cd backend
pip install -r requirements.txt
```

2. Configure environment:

```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. Set up MySQL database:

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p pocketcare_db < database/seed_data.sql
```

4. Run the backend:

```bash
python app.py
```

Backend runs at `http://localhost:5000`

### Frontend Setup

1. Install dependencies:

```bash
cd frontend
npm install
```

2. Run the development server:

```bash
npm start
```

Frontend runs at `http://localhost:3000`

## Admin Portal

### Accessing the Admin Dashboard

1. Navigate to `http://localhost:3000/admin/login`
2. Default admin credentials:
   - **Email:** `admin@pocketcare.com`
   - **Password:** `admin123`

### Admin Dashboard Features

- **Dashboard:** Overview of system statistics
- **Users Management:** View and manage user accounts
- **Doctors & Hospitals:** Manage healthcare providers
- **Appointments:** Track and manage appointments
- **SOS Alerts:** Monitor emergency requests
- **Reports:** View OCR and medical reports
- **AI Monitoring:** Monitor AI predictions and chatbot activity
- **Settings:** Admin configuration options

### Creating Additional Admin Accounts

1. Use the password hash generator script:

```bash
cd backend
python generate_admin_hash.py
# Enter your desired password when prompted
```

2. Insert the hash into the database:

```sql
INSERT INTO admins (email, password_hash, name, role, is_active) 
VALUES ('neweadmin@pocketcare.com', 'PASTE_HASH_HERE', 'Admin Name', 'admin', TRUE);
```

## Phase 1 Status

✅ Project structure initialized
✅ Backend authentication system (JWT, bcrypt)
✅ Frontend authentication pages (login, register)
✅ Database schema created
✅ Basic routing and protected routes
✅ Admin portal and dashboard

## Next Steps

- Set up MySQL database
- Test authentication flow
- Begin Phase 2: Core Features (symptom analyzer, doctor directory)

## Documentation

- See `PROJECT_PLAN.txt` for complete project roadmap
- See `backend/README.md` for API documentation
- See `frontend/README.md` for frontend details

## Tech Stack

- **Frontend:** React, Tailwind CSS, Axiosjj
- **Backend:** Flask, JWT, bcrypt
- **Database:** MySQL
- **AI:** Google Gemini API (to be integrated)

## Team Collaboration Guide

### Initial Setup for Team Members

1. **Clone the repository:**

```bash
git clone https://github.com/sadekinborno/PocketCare.git
cd PocketCare
```

2. **Set up your development environment** following the Quick Start guide above

### Git Workflow

#### Daily Workflow

1. **Always start by updating your local repository:**

```bash
git checkout main
git pull origin main
```

2. **Create a feature branch for your task:**

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

Branch naming conventions:

- `feature/` - for new features (e.g., `feature/symptom-analyzer`)
- `fix/` - for bug fixes (e.g., `fix/login-validation`)
- `docs/` - for documentation updates
- `refactor/` - for code refactoring

3. **Make your changes and commit regularly:**

```bash
git add .
git commit -m "Clear description of what you changed"
```

Commit message guidelines:

- Use present tense ("Add feature" not "Added feature")
- Be specific and descriptive
- Reference issues if applicable (e.g., "Fix login bug #23")

4. **Push your branch to GitHub:**

```bash
git push origin feature/your-feature-name
```

5. **Create a Pull Request (PR):**

   - Go to the GitHub repository
   - Click "Pull requests" → "New pull request"
   - Select your branch
   - Add a clear title and description
   - Request review from team members
   - Link any related issues
6. **Code Review Process:**

   - At least one team member should review the PR
   - Address any feedback or requested changes
   - Once approved, merge the PR into main
   - Delete the feature branch after merging
7. **After your PR is merged:**

```bash
git checkout main
git pull origin main
git branch -d feature/your-feature-name  # Delete local branch
```

### Handling Merge Conflicts

If you encounter merge conflicts:

1. **Update your branch with latest main:**

```bash
git checkout main
git pull origin main
git checkout feature/your-feature-name
git merge main
```

2. **Resolve conflicts in your code editor:**

   - Look for conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`)
   - Choose which changes to keep
   - Remove conflict markers
3. **Commit the resolution:**

```bash
git add .
git commit -m "Resolve merge conflicts"
git push origin feature/your-feature-name
```

### Best Practices

- **Communicate:** Use GitHub issues and project board to track tasks
- **Pull frequently:** Always pull the latest changes before starting work
- **Commit often:** Make small, logical commits with clear messages
- **Test before pushing:** Ensure your code works before pushing
- **Keep PRs focused:** One feature/fix per pull request
- **Review promptly:** Review team members' PRs in a timely manner
- **Don't commit sensitive data:** Never commit API keys, passwords, or .env files
- **Update .gitignore:** Ensure local config files are ignored

### Useful Git Commands

```bash
# Check status of your changes
git status

# View commit history
git log --oneline

# Discard local changes to a file
git checkout -- filename

# View differences before committing
git diff

# Stash changes temporarily
git stash
git stash pop

# Update your feature branch with main
git fetch origin
git rebase origin/main

# View all branches
git branch -a
```

### Getting Help

- **Stuck on a merge conflict?** Ask a team member to pair program
- **Unsure about a change?** Create a draft PR and ask for early feedback
- **Found a bug?** Create an issue on GitHub before starting work

### Project Communication

- Use GitHub Issues for bug reports and feature requests
- Use Pull Request comments for code-specific discussions
- Tag team members with @username for their attention
- Keep the project board updated with your task status
