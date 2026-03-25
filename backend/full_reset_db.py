import asyncio
from sqlalchemy import text
from db.session import engine as sqlalchemy_engine

async def full_reset_db():
    async with sqlalchemy_engine.begin() as conn:
        # Drop all enum types
        result = await conn.execute(text("""
            SELECT typname FROM pg_type 
            WHERE typtype = 'e' AND typnamespace = (
                SELECT oid FROM pg_namespace WHERE nspname = 'public'
            )
        """))
        enum_types = result.fetchall()
        print(f'Found {len(enum_types)} enum types to drop')
        
        for enum_type in enum_types:
            type_name = enum_type[0]
            try:
                await conn.execute(text(f'DROP TYPE IF EXISTS "{type_name}" CASCADE'))
                print(f'  ✓ Dropped enum type: {type_name}')
            except Exception as e:
                print(f'  ✗ Failed to drop {type_name}: {e}')
        
        # Drop all tables
        result = await conn.execute(text("""
            SELECT tablename FROM pg_tables 
            WHERE schemaname = 'public'
        """))
        table_names = result.fetchall()
        print(f'\nFound {len(table_names)} tables to drop')
        
        for table in table_names:
            table_name = table[0]
            try:
                await conn.execute(text(f'DROP TABLE IF EXISTS "{table_name}" CASCADE'))
                print(f'  ✓ Dropped table: {table_name}')
            except Exception as e:
                print(f'  ✗ Failed to drop {table_name}: {e}')
    
    await sqlalchemy_engine.dispose()
    print('\n✓ Full database reset complete (tables + enum types)')

asyncio.run(full_reset_db())
