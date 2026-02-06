from django.contrib import admin
from .models import Batch, BatchCoordinator


class BatchCoordinatorInline(admin.TabularInline):
    model = BatchCoordinator
    extra = 1
    raw_id_fields = ['user']


@admin.register(Batch)
class BatchAdmin(admin.ModelAdmin):
    list_display = ('year', 'display_name', 'coordinator_count', 'created_at')
    list_filter = ('year',)
    search_fields = ('year', 'display_name')
    ordering = ('-year',)
    inlines = [BatchCoordinatorInline]
    
    def coordinator_count(self, obj):
        return obj.coordinators.count()
    coordinator_count.short_description = 'Coordinators'


@admin.register(BatchCoordinator)
class BatchCoordinatorAdmin(admin.ModelAdmin):
    list_display = ('user', 'batch', 'created_at')
    list_filter = ('batch',)
    search_fields = ('user__email', 'user__username', 'batch__year')
    raw_id_fields = ['user', 'batch']
