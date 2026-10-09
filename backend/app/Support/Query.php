<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class Query
{
    /** An integer query parameter; malformed input is a 400, not a 500. */
    public static function int(Request $request, string $name, ?int $default = null, ?int $min = null, ?int $max = null): ?int
    {
        $raw = $request->query($name);
        if ($raw === null || $raw === '') {
            return $default;
        }
        if (! is_string($raw) || ! preg_match('/^-?\d{1,9}$/', $raw)) {
            throw ValidationException::withMessages([$name => 'Must be a whole number.']);
        }
        $value = (int) $raw;
        if ($min !== null) {
            $value = max($value, $min);
        }
        if ($max !== null) {
            $value = min($value, $max);
        }

        return $value;
    }

    public static function text(Request $request, string $name, int $max = 100): string
    {
        $raw = $request->query($name);

        return is_string($raw) ? mb_substr(trim($raw), 0, $max) : '';
    }

    /** LIKE pattern with the user's % and _ escaped. */
    public static function like(string $value): string
    {
        return '%'.addcslashes($value, '%_\\').'%';
    }

    /**
     * Case-insensitive "contains" across several columns. "relation.column"
     * searches a related model (e.g. "user.email").
     */
    public static function search(Builder $query, array $columns, string $term): Builder
    {
        $pattern = static::like(mb_strtolower($term));
        $match = fn (Builder $q, string $column, string $boolean) => $q->whereRaw(
            'LOWER('.$q->getQuery()->getGrammar()->wrap($q->getModel()->qualifyColumn($column)).") LIKE ? ESCAPE '\\'",
            [$pattern],
            $boolean,
        );

        return $query->where(function (Builder $q) use ($columns, $match) {
            foreach ($columns as $column) {
                if (str_contains($column, '.')) {
                    [$relation, $field] = explode('.', $column, 2);
                    $q->orWhereHas($relation, fn (Builder $r) => $match($r, $field, 'and'));
                } else {
                    $match($q, $column, 'or');
                }
            }
        });
    }

    /** Page a query with the response shape the frontend expects. */
    public static function paginate(Request $request, Builder $query, callable $present, int $defaultSize = 20): array
    {
        $size = static::int($request, 'page_size', $defaultSize, 1, 100);
        $page = static::int($request, 'page', 1, 1);
        $total = (clone $query)->toBase()->getCountForPagination();
        $pages = max(1, (int) ceil($total / $size));
        $page = min($page, $pages);
        $items = $query->forPage($page, $size)->get();

        return [
            'results' => $items->map($present)->values()->all(),
            'total' => $total,
            'pages' => $pages,
            'current_page' => $page,
            'has_next' => $page < $pages,
            'has_previous' => $page > 1,
        ];
    }
}
