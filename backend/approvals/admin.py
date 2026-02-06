from django.contrib import admin
from .models import ApprovalLog


@admin.register(ApprovalLog)
class ApprovalLogAdmin(admin.ModelAdmin):
    list_display = ('alumni', 'status', 'approved_by', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('alumni__full_name_en', 'approved_by__email', 'note')
    ordering = ('-created_at',)
    raw_id_fields = ['alumni', 'approved_by']
    readonly_fields = ['created_at']
