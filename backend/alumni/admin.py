from django.contrib import admin
from .models import AlumniProfile


@admin.register(AlumniProfile)
class AlumniProfileAdmin(admin.ModelAdmin):
    list_display = ('full_name_en', 'batch', 'profession', 'status', 'created_at')
    list_filter = ('status', 'batch', 'country')
    search_fields = ('full_name_en', 'full_name_bn', 'user__email', 'profession')
    ordering = ('-created_at',)
    raw_id_fields = ['user', 'batch', 'approved_by', 'recommended_by']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('User Info', {
            'fields': ('user', 'batch', 'status', 'approved_by', 'review_note', 'recommended_by', 'recommended_at')
        }),
        ('Identity', {
            'fields': ('full_name_bn', 'full_name_en', 'roll', 'section', 'photo')
        }),
        ('Location', {
            'fields': ('city', 'country')
        }),
        ('Professional', {
            'fields': ('profession', 'company', 'university', 'bio')
        }),
        ('Social', {
            'fields': ('facebook', 'linkedin')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
