from datetime import datetime, timezone
import pytz

def format_utc_iso(dt: datetime) -> str:
    """
    Consistently format a datetime as UTC ISO 8601 with trailing Z.
    Ensures that any incoming timezone info is respected and converted to UTC.
    Always treats naive datetimes from the database as UTC.
    """
    if dt is None:
        return None
        
    if dt.tzinfo is None:
        # Naive datetime from the DB → treat as UTC
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        # If it has tzinfo (like IST or anything from dateutil), convert to UTC
        dt = dt.astimezone(timezone.utc)
        
    return dt.strftime('%Y-%m-%dT%H:%M:%SZ')
