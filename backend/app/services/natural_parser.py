import re
from datetime import date, datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple

CATEGORY_KEYWORD_MAP = {
    "Groceries": [
        "grocery", "groceries", "supermarket", "reliance fresh", "blinkit", "zepto",
        "instamart", "bigbasket", "vegetables", "vegetable", "fruits", "fruit",
        "milk", "curd", "bread", "ration", "dmart", "d-mart", "nature's basket"
    ],
    "Food": [
        "coffee", "tea", "chai", "breakfast", "lunch", "dinner", "snack", "snacks",
        "burger", "pizza", "cafe", "starbucks", "swiggy", "zomato", "mcdonalds", "mcdonald's",
        "kfc", "dominos", "domino's", "subway", "biryani", "food", "eat", "meal",
        "bakery", "dosa", "idli", "samosa", "cake", "ice cream", "dessert"
    ],
    "Restaurants": [
        "restaurant", "fine dining", "buffet", "barbeque", "dhaba", "bistro", "diner"
    ],
    "Transport": [
        "uber", "ola", "rapido", "cab", "taxi", "auto", "metro", "bus", "train",
        "irctc", "flight", "airline", "petrol", "diesel", "fuel", "gasoline", "toll",
        "fastag", "parking", "bike", "scooter", "commute", "fare"
    ],
    "Bills & Utilities": [
        "electricity", "power bill", "water bill", "gas bill", "cylinder", "wifi",
        "broadband", "internet", "mobile recharge", "airtel", "jio", "vi", "vodafone",
        "dth", "tata play", "maintenance bill", "utility", "bills", "current bill"
    ],
    "Entertainment": [
        "netflix", "prime video", "hotstar", "spotify", "youtube premium", "movie",
        "cinema", "pvr", "inox", "bookmyshow", "concert", "game", "gaming", "steam",
        "playstation", "amusement park"
    ],
    "Shopping": [
        "amazon", "flipkart", "myntra", "ajio", "meesho", "clothes", "clothing",
        "shirt", "pants", "shoes", "sneakers", "electronics", "zara", "h&m", "shopping",
        "mall", "watch", "gadget", "headphones"
    ],
    "Healthcare": [
        "pharmacy", "medicine", "medicines", "medical", "doctor", "clinic", "hospital",
        "dental", "dentist", "lab test", "blood test", "1mg", "apollo", "pharmeasy",
        "consultation fee", "physio"
    ],
    "Education": [
        "tuition", "course", "courses", "books", "stationery", "school fee", "college fee",
        "exam fee", "udemy", "coursera", "book", "pen", "notebook"
    ],
    "Rent": [
        "rent", "house rent", "flat rent", "room rent", "pg rent", "hostel fee"
    ],
    "Travel": [
        "hotel", "resort", "airbnb", "trip", "vacation", "holiday", "tour", "makemytrip",
        "goibibo", "booking.com", "hostel"
    ],
    "Personal Care": [
        "haircut", "salon", "parlour", "spa", "grooming", "gym", "fitness", "cult.fit",
        "skin care", "cosmetics", "massage"
    ]
}

def infer_category(text: str) -> str:
    lower_text = text.lower()
    for cat, keywords in CATEGORY_KEYWORD_MAP.items():
        for kw in keywords:
            # Check whole word match or substring
            if re.search(r'\b' + re.escape(kw) + r'\b', lower_text):
                return cat
    return "Other"

def parse_relative_date(text: str) -> date:
    lower = text.lower()
    today = date.today()
    if "day before yesterday" in lower:
        return today - timedelta(days=2)
    elif "yesterday" in lower:
        return today - timedelta(days=1)
    elif "tomorrow" in lower:
        return today + timedelta(days=1)
    elif "today" in lower:
        return today
    
    # check for "X days ago"
    days_ago = re.search(r'(\d+)\s+days?\s+ago', lower)
    if days_ago:
        return today - timedelta(days=int(days_ago.group(1)))
        
    return today

def parse_payment_method(text: str) -> str:
    lower = text.lower()
    if any(k in lower for k in ["upi", "gpay", "google pay", "phonepe", "paytm", "cred", "bhim"]):
        return "UPI"
    elif any(k in lower for k in ["cash", "cod"]):
        return "Cash"
    elif any(k in lower for k in ["credit card", "creditcard", "cc"]):
        return "Credit Card"
    elif any(k in lower for k in ["debit card", "debitcard", "dc"]):
        return "Debit Card"
    elif any(k in lower for k in ["net banking", "netbanking", "bank transfer", "neft", "imps"]):
        return "Net Banking"
    return "UPI" # Standard Indian default

def extract_merchant(text: str, category: str = "Other") -> Optional[str]:
    # 1. Check known merchant brands in text first
    known_merchants = [
        "Reliance Fresh", "Blinkit", "Zepto", "Instamart", "BigBasket", "DMart",
        "Amazon", "Flipkart", "Myntra", "Ajio", "Zomato", "Swiggy", "Uber", "Ola",
        "Rapido", "Starbucks", "McDonalds", "KFC", "Dominos", "Subway", "Airtel",
        "Jio", "Apollo Pharmacy", "Cult.fit", "PVR", "INOX"
    ]
    lower = text.lower()
    for m in known_merchants:
        if m.lower() in lower:
            return m

    # 2. Look for "at X", "from X"
    merchant_match = re.search(r'\b(?:at|from)\s+([A-Za-z0-9\s&\'\.]+?)(?:\s+(?:yesterday|today|last\s+week|using|via|paid|by|for|\₹|\d+|$))', text, re.IGNORECASE)
    if merchant_match:
        m = merchant_match.group(1).strip()
        # Clean up words that aren't merchants
        if m.lower() not in ["upi", "cash", "gpay", "phonepe", "credit card", "debit card", "groceries", "food", "petrol"]:
            return m.title()
            
    return None

def extract_amount(text: str) -> Optional[float]:
    # Match patterns like: ₹450, Rs 450, Rs. 450, 450 rupees, 450 bucks, 450 rs, ₹ 1,250.50
    # Also handle "2.4k" -> 2400
    k_match = re.search(r'(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*k\b', text, re.IGNORECASE)
    if k_match:
        return float(k_match.group(1)) * 1000

    patterns = [
        r'(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)', # ₹450, Rs. 450
        r'([\d,]+(?:\.\d{1,2})?)\s*(?:₹|rupees|rupee|bucks|rs\.?|inr)', # 450 rupees
        r'\b(?:spent|paid|record|add|cost|for)\s+([\d,]+(?:\.\d{1,2})?)\b', # spent 450
    ]
    for p in patterns:
        m = re.search(p, text, re.IGNORECASE)
        if m:
            val_str = m.group(1).replace(",", "")
            try:
                val = float(val_str)
                if val > 0:
                    return val
            except ValueError:
                continue

    # Generic last resort number matching if words like "bought", "spent", "coffee" are present
    num_match = re.search(r'\b(\d+(?:\.\d{1,2})?)\b', text)
    if num_match:
        try:
            val = float(num_match.group(1))
            # Don't accidentally treat a year like 2026 as an amount unless specified
            if val != 2026 and val > 0:
                return val
        except ValueError:
            pass
    return None

def parse_multi_expense_items(text: str) -> List[Dict[str, Any]]:
    """
    Handles sentences like:
    "Add coffee ₹120, lunch ₹250 and Uber ₹180 today."
    Splits by commas, 'and', 'also', '+' and checks if multiple amounts exist.
    """
    raw_date = parse_relative_date(text)
    default_payment = parse_payment_method(text)

    # First remove prefix "add", "record", "spent"
    cleaned = re.sub(r'^(?:please\s+)?(?:add|record|log|insert|track)\s+', '', text, flags=re.IGNORECASE)
    
    # Split by conjunctions: commas, " and ", " also ", " & "
    chunks = re.split(r'[,;&]|\band\b|\balso\b', cleaned, flags=re.IGNORECASE)
    items = []
    
    for chunk in chunks:
        chunk = chunk.strip()
        if not chunk:
            continue
        amt = extract_amount(chunk)
        if amt:
            desc_cleaned = re.sub(r'(?:₹|rs\.?|rupees|rupee|bucks|inr|[\d,]+(?:\.\d+)?|\b(?:i|spent|paid|record|add|bought|using|via|upi|cash|today|yesterday|day before yesterday)\b)', ' ', chunk, flags=re.IGNORECASE)
            desc_cleaned = re.sub(r'\s+', ' ', desc_cleaned).strip(' .,')
            # Clean leading/trailing prepositions
            desc_cleaned = re.sub(r'^(?:for|on|at|of)\s+', '', desc_cleaned, flags=re.IGNORECASE).strip(' .,')
            desc = desc_cleaned if len(desc_cleaned) > 1 else chunk
            if not desc:
                desc = "Expense"
            desc = desc.capitalize()

            cat = infer_category(chunk)
            merchant = extract_merchant(chunk, cat)
            pay_method = parse_payment_method(chunk)
            if pay_method == "UPI" and default_payment != "UPI":
                pay_method = default_payment

            items.append({
                "amount": amt,
                "category": cat,
                "description": desc,
                "merchant": merchant,
                "date": raw_date.strftime("%Y-%m-%d") if isinstance(raw_date, (date, datetime)) else raw_date,
                "payment_method": pay_method
            })

    return items
