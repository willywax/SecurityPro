from sqlalchemy import create_engine, text
import os

db_url = os.getenv('DATABASE_URL', 'postgresql://postgres:admin@localhost:5432/securitypro')
# Convert async URL to sync for direct query
db_url = db_url.replace('+asyncpg', '')

engine = create_engine(db_url)
with engine.connect() as conn:
    result = conn.execute(text("SELECT email, password_hash FROM users WHERE email = 'admin@securityops.com'"))
    row = result.fetchone()
    if row:
        print(f'✓ User found: {row[0]}')
        print(f'  Password Hash: {row[1]}')
    else:
        print('✗ User not found')
        # List all users
        result = conn.execute(text('SELECT email FROM users'))
        all_users = result.fetchall()
        print(f'Total users in DB: {len(all_users)}')
        for user in all_users:
            print(f'  - {user[0]}')

engine.dispose()
