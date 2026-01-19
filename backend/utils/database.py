import pymysql
from config import Config

def get_db_connection():
    """Create and return a database connection"""
    connection = pymysql.connect(
        host=Config.DB_HOST,
        port=int(Config.DB_PORT),
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        database=Config.DB_NAME,
        connect_timeout=5,
        read_timeout=30,
        write_timeout=30,
        cursorclass=pymysql.cursors.DictCursor
    )
    return connection

def execute_query(query, params=None, fetch_one=False, fetch_all=False, commit=False):
    """
    Execute a database query with error handling
    
    Args:
        query: SQL query string
        params: Tuple of parameters for the query
        fetch_one: Return single row
        fetch_all: Return all rows
        commit: Commit changes (for INSERT/UPDATE/DELETE)
    
    Returns:
        Query results or lastrowid for INSERT operations
    """
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(query, params)
            
            if commit:
                connection.commit()
                return cursor.lastrowid
            
            if fetch_one:
                return cursor.fetchone()
            
            if fetch_all:
                return cursor.fetchall()
            
    except Exception as e:
        connection.rollback()
        raise e
    finally:
        connection.close()
