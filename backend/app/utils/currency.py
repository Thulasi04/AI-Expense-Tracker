from decimal import Decimal, ROUND_HALF_UP
from typing import Union

def rupees_to_paise(amount: Union[float, int, str, Decimal]) -> int:
    """
    Safely convert rupee amount to integer paise avoiding floating point precision errors.
    e.g. 450.50 -> 45050 paise
    """
    if isinstance(amount, (float, int)):
        dec = Decimal(str(amount))
    elif isinstance(amount, str):
        # clean currency symbols and commas
        cleaned = amount.replace("₹", "").replace(",", "").strip()
        dec = Decimal(cleaned)
    else:
        dec = amount
    paise = (dec * Decimal("100")).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    return int(paise)

def paise_to_rupees(paise: int) -> float:
    """
    Convert integer paise to float rupees with 2 decimal places precision.
    """
    return float(Decimal(paise) / Decimal("100"))

def format_inr(amount: Union[float, int, Decimal], is_paise: bool = False, include_symbol: bool = True) -> str:
    """
    Format a number into Indian Rupee locale format (e.g. ₹1,25,000.00 or ₹450.00).
    Indian numbering system: last 3 digits, then groups of 2 digits.
    """
    if is_paise:
        val = Decimal(amount) / Decimal("100")
    else:
        val = Decimal(str(amount))
        
    is_negative = val < 0
    val = abs(val).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    
    parts = f"{val:.2f}".split(".")
    integer_part = parts[0]
    decimal_part = parts[1]
    
    if len(integer_part) > 3:
        last_three = integer_part[-3:]
        remaining = integer_part[:-3]
        groups = []
        while len(remaining) > 2:
            groups.append(remaining[-2:])
            remaining = remaining[:-2]
        if remaining:
            groups.append(remaining)
        groups.reverse()
        formatted_int = ",".join(groups) + "," + last_three
    else:
        formatted_int = integer_part
        
    formatted = f"{formatted_int}.{decimal_part}"
    prefix = "-" if is_negative else ""
    symbol = "₹" if include_symbol else ""
    return f"{prefix}{symbol}{formatted}"
