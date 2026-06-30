import re

from rest_framework.serializers import ValidationError

# Мобильные коды операторов KZ (3 цифры после +7)
KZ_MOBILE_CODES = (
    '700', '701', '702', '703', '704', '705', '706', '707', '708',
    '747', '771', '775', '776', '777', '778',
)


def normalize_phone(value: str) -> str:
    """
    Казахстан: +7 + 10 цифр = 11 цифр всего.
    Пример: +7 (700) 123-45-67 → +77001234567
    """
    digits = re.sub(r'\D', '', value or '')
    if digits.startswith('8'):
        digits = '7' + digits[1:]
    if not digits.startswith('7'):
        digits = '7' + digits
    digits = digits[:11]
    return '+' + digits


def validate_kz_phone(value: str) -> str:
    normalized = normalize_phone(value)
    digits = normalized.lstrip('+')  # 77001234567 — 11 цифр
    if len(digits) != 11:
        raise ValidationError(
            'Номер Казахстана: +7 (XXX) XXX-XX-XX. '
            'Пример: +7 (700) 123-45-67'
        )
    operator_code = digits[1:4]
    if operator_code not in KZ_MOBILE_CODES:
        raise ValidationError(
            f'Некорректный код оператора {operator_code}. '
            f'Допустимы: {", ".join(KZ_MOBILE_CODES)}'
        )
    return normalized
