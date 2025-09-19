/**
 * Filters Panel component for the dashboard
 * Time range, project, status filters with URL query params persistence
 */

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FilterOptions } from '@/models/asanaReport';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Calendar, X, Filter } from 'lucide-react';
import dayjs from 'dayjs';

interface FiltersPanelProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  availableProjects?: string[];
  availableSections?: string[];
  className?: string;
}

export function FiltersPanel({
  filters,
  onFiltersChange,
  availableProjects = [],
  availableSections = [],
  className = '',
}: FiltersPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [localFilters, setLocalFilters] = useState<FilterOptions>(filters);

  // Initialize filters from URL params on mount
  useEffect(() => {
    const urlFilters: FilterOptions = {};
    
    // Time range
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');
    if (startDate && endDate) {
      urlFilters.timeRange = { start: startDate, end: endDate };
    }
    
    // Projects
    const projects = searchParams.get('projects');
    if (projects) {
      urlFilters.projects = projects.split(',');
    }
    
    // Sections
    const sections = searchParams.get('sections');
    if (sections) {
      urlFilters.sections = sections.split(',');
    }
    
    // Status
    const status = searchParams.get('status');
    if (status && ['all', 'completed', 'pending', 'overdue'].includes(status)) {
      urlFilters.status = status as FilterOptions['status'];
    }
    
    // Assignees
    const assignees = searchParams.get('assignees');
    if (assignees) {
      urlFilters.assignees = assignees.split(',');
    }
    
    setLocalFilters(urlFilters);
    onFiltersChange(urlFilters);
  }, [searchParams, onFiltersChange]);

  // Update URL when filters change
  const updateURL = (newFilters: FilterOptions) => {
    const params = new URLSearchParams();
    
    if (newFilters.timeRange) {
      params.set('start', newFilters.timeRange.start);
      params.set('end', newFilters.timeRange.end);
    }
    
    if (newFilters.projects && newFilters.projects.length > 0) {
      params.set('projects', newFilters.projects.join(','));
    }
    
    if (newFilters.sections && newFilters.sections.length > 0) {
      params.set('sections', newFilters.sections.join(','));
    }
    
    if (newFilters.status && newFilters.status !== 'all') {
      params.set('status', newFilters.status);
    }
    
    if (newFilters.assignees && newFilters.assignees.length > 0) {
      params.set('assignees', newFilters.assignees.join(','));
    }
    
    const queryString = params.toString();
    const newURL = queryString ? `?${queryString}` : window.location.pathname;
    
    router.replace(newURL, { scroll: false });
  };

  const handleFilterChange = (newFilters: FilterOptions) => {
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
    updateURL(newFilters);
  };

  const handleTimeRangeChange = (start: string, end: string) => {
    const newFilters = {
      ...localFilters,
      timeRange: { start, end },
    };
    handleFilterChange(newFilters);
  };

  const handleStatusChange = (status: string) => {
    const newFilters = {
      ...localFilters,
      status: status as FilterOptions['status'],
    };
    handleFilterChange(newFilters);
  };

  const handleProjectToggle = (project: string) => {
    const currentProjects = localFilters.projects || [];
    const newProjects = currentProjects.includes(project)
      ? currentProjects.filter(p => p !== project)
      : [...currentProjects, project];
    
    const newFilters = {
      ...localFilters,
      projects: newProjects,
    };
    handleFilterChange(newFilters);
  };

  const handleSectionToggle = (section: string) => {
    const currentSections = localFilters.sections || [];
    const newSections = currentSections.includes(section)
      ? currentSections.filter(s => s !== section)
      : [...currentSections, section];
    
    const newFilters = {
      ...localFilters,
      sections: newSections,
    };
    handleFilterChange(newFilters);
  };

  const clearAllFilters = () => {
    const emptyFilters: FilterOptions = {};
    handleFilterChange(emptyFilters);
  };

  const hasActiveFilters = () => {
    return !!(
      localFilters.timeRange ||
      (localFilters.projects && localFilters.projects.length > 0) ||
      (localFilters.sections && localFilters.sections.length > 0) ||
      (localFilters.status && localFilters.status !== 'all')
    );
  };

  // Get default date range (last 3 months)
  const getDefaultDateRange = () => {
    const end = dayjs().format('YYYY-MM-DD');
    const start = dayjs().subtract(3, 'months').format('YYYY-MM-DD');
    return { start, end };
  };

  const defaultRange = getDefaultDateRange();

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>Filters</span>
            {hasActiveFilters() && (
              <Badge variant="secondary" className="ml-2">
                Active
              </Badge>
            )}
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            {hasActiveFilters() && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
              >
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className={isExpanded ? '' : 'hidden'}>
        <div className="space-y-6">
          {/* Time Range */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              <Calendar className="w-4 h-4 inline mr-1" />
              Time Range
            </Label>
            <div className="flex items-center space-x-2">
              <Input
                type="date"
                value={localFilters.timeRange?.start || defaultRange.start}
                onChange={(e) => handleTimeRangeChange(
                  e.target.value, 
                  localFilters.timeRange?.end || defaultRange.end
                )}
                className="flex-1"
              />
              <span className="text-gray-500">to</span>
              <Input
                type="date"
                value={localFilters.timeRange?.end || defaultRange.end}
                onChange={(e) => handleTimeRangeChange(
                  localFilters.timeRange?.start || defaultRange.start,
                  e.target.value
                )}
                className="flex-1"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Status
            </Label>
            <Select
              value={localFilters.status || 'all'}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tasks</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Projects Filter */}
          {availableProjects.length > 0 && (
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Projects ({localFilters.projects?.length || 0} selected)
              </Label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {availableProjects.map(project => (
                  <div key={project} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`project-${project}`}
                      checked={localFilters.projects?.includes(project) || false}
                      onChange={() => handleProjectToggle(project)}
                      className="mr-2"
                    />
                    <Label 
                      htmlFor={`project-${project}`}
                      className="text-sm cursor-pointer"
                    >
                      {project}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sections Filter */}
          {availableSections.length > 0 && (
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Sections ({localFilters.sections?.length || 0} selected)
              </Label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {availableSections.map(section => (
                  <div key={section} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`section-${section}`}
                      checked={localFilters.sections?.includes(section) || false}
                      onChange={() => handleSectionToggle(section)}
                      className="mr-2"
                    />
                    <Label 
                      htmlFor={`section-${section}`}
                      className="text-sm cursor-pointer"
                    >
                      {section}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Filters Summary */}
          {hasActiveFilters() && (
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Active Filters
              </Label>
              <div className="flex flex-wrap gap-2">
                {localFilters.timeRange && (
                  <Badge variant="outline">
                    {dayjs(localFilters.timeRange.start).format('MMM DD')} - {dayjs(localFilters.timeRange.end).format('MMM DD')}
                  </Badge>
                )}
                
                {localFilters.status && localFilters.status !== 'all' && (
                  <Badge variant="outline">
                    Status: {localFilters.status}
                  </Badge>
                )}
                
                {localFilters.projects?.map(project => (
                  <Badge key={project} variant="outline">
                    Project: {project}
                    <X 
                      className="w-3 h-3 ml-1 cursor-pointer" 
                      onClick={() => handleProjectToggle(project)}
                    />
                  </Badge>
                ))}
                
                {localFilters.sections?.map(section => (
                  <Badge key={section} variant="outline">
                    Section: {section}
                    <X 
                      className="w-3 h-3 ml-1 cursor-pointer" 
                      onClick={() => handleSectionToggle(section)}
                    />
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}