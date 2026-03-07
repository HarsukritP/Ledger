def format_money(value: float, show_sign: bool = False) -> str:
    abs_val = abs(value)
    formatted = f"{abs_val:,.2f}"
    prefix = "-" if value < 0 else ("+" if show_sign and value > 0 else "")
    return f"{prefix}${formatted}"
