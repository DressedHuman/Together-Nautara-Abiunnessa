from django.core.paginator import Paginator
from rest_framework.exceptions import ValidationError


def int_param(request, name, default=None, minimum=None, maximum=None):
    """Read an integer query parameter; malformed input is a 400, not a 500."""
    raw = request.query_params.get(name)
    if raw in (None, ''):
        return default
    try:
        value = int(raw)
    except (TypeError, ValueError):
        raise ValidationError({name: 'Must be a whole number.'})
    if minimum is not None:
        value = max(value, minimum)
    if maximum is not None:
        value = min(value, maximum)
    return value


def text_param(request, name, max_length=100):
    return (request.query_params.get(name) or '').strip()[:max_length]


def paginate(request, queryset, serializer_class, context=None, default_size=20):
    """Page a queryset with the response shape the frontend expects."""
    page_size = int_param(request, 'page_size', default_size, 1, 100)
    page_num = int_param(request, 'page', 1, 1)
    paginator = Paginator(queryset, page_size)
    page = paginator.get_page(page_num)
    data = serializer_class(page.object_list, many=True, context=context or {'request': request}).data
    return {
        'results': data,
        'total': paginator.count,
        'pages': paginator.num_pages,
        'current_page': page.number,
        'has_next': page.has_next(),
        'has_previous': page.has_previous(),
    }
