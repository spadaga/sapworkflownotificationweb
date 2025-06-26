# Remove readme.txt from all commits in history
git filter-branch --force --index-filter \
'git rm --cached --ignore-unmatch readme.txt' \
--prune-empty --tag-name-filter cat -- --all

# Force push to update remote
git push origin main --force

# Start interactive rebase from before the problematic commit
git rebase -i 7bb0083

# In the editor, change 'pick' to 'edit' for commit 745f2f6
# Save and exit

# Remove the file from that commit
git rm readme.txt
git commit --amend --no-edit

# Continue the rebase
git rebase --continue

# Force push
git push origin main --force

# Install git-filter-repo first, then:
git filter-repo --path readme.txt --invert-paths

# Force push
git push origin main --force

# Remove readme.txt from all commits in history
git filter-branch --force --index-filter \
'git rm --cached --ignore-unmatch readme.txt' \
--prune-empty --tag-name-filter cat -- --all

# Force push to update remote
git push origin main --force


git status

# Add the deletion to staging
git add -A

# Commit the deletion
git commit -m "Remove .env files with secrets"

# Now push
git push origin main


# See what files Git is tracking
git ls-files | findstr env

# Check current status
git status

# Stage all current changes (including deletions)
git add .


# Commit current state
git commit -m "Remove all .env files"

# If it still fails, create completely new history
git checkout --orphan fresh-start
git add .
git commit -m "Initial commit without any secrets"
git branch -D main
git branch -m main
git push -f origin main

# Start interactive rebase from the commit before the problematic one
git rebase -i 7bb0083

# In the editor that opens, change 'pick' to 'edit' for commit 745f2f6
# Save and close the editor

# Edit the readme.txt file to remove the secret at line 490
# Then amend the commit
git add readme.txt
git commit --amend --no-edit

# Continue the rebase
git rebase --continue

# Force push (this will rewrite history)
git push origin main --force

# Install BFG Repo-Cleaner and run:
java -jar bfg.jar --replace-text passwords.txt your-repo.git

# Create a backup branch first
git branch backup-main

# Reset to the commit before the secret was added
git reset --hard 7bb0083

# Re-add your changes without the secret
# Then force push
git push origin main --force

# Create new orphan branch
git checkout --orphan clean-branch

# Add all files except .env.production
git add .

# Commit
git commit -m "Clean initial commit without secrets"

# Delete the old main branch
git branch -D main

# Rename current branch to main
git branch -m main

# Force push
git push -f origin main