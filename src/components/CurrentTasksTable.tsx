/**
 * Current Tasks Table component
 * Shows subtasks with sorting, filtering, search, and pagination
 */

import { useState, useMemo } from 'react';
import { Subtask, Section } from '@/models/asanaReport';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { 
  Search, 
  ChevronUp, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight,
  CheckCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import dayjs from 'dayjs';

interface TaskWithContext {
  subtask: Subtask;
  taskName: string;
  sectionName: string;
  createdWeek: string;
  isOverdue: boolean;
}

interface CurrentTasksTableProps {
  sections: Section[];
  assigneeGid: string;
  pageSize?: number;
}

type SortField = 'taskName' | 'sectionName' | 'createdWeek' | 'dueDate' | 'status';
type SortDirection = 'asc' | 'desc';

export function CurrentTasksTable({ 
  sections, 
  assigneeGid, 
  pageSize = 10 
}: CurrentTasksTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('createdWeek');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending' | 'overdue'>('all');

  // Process data: get all subtasks for the assignee with context
  const tasksWithContext = useMemo(() => {
    const result: TaskWithContext[] = [];

    sections.forEach(section => {
      section.tasks.forEach(task => {
        task.subtasks?.forEach(subtask => {
          if (subtask.assignee?.gid === assigneeGid) {
            const isOverdue = subtask.due_on && 
              !subtask.completed && 
              dayjs(subtask.due_on).isBefore(dayjs(), 'day');
            
            const createdWeek = subtask.created_at 
              ? dayjs(subtask.created_at).format('DD MMM YYYY')
              : 'Unknown';

            result.push({
              subtask,
              taskName: subtask.name,
              sectionName: section.name,
              createdWeek,
              isOverdue: Boolean(isOverdue),
            });
          }
        });
      });
    });

    return result;
  }, [sections, assigneeGid]);

  // Apply filters and search
  const filteredTasks = useMemo(() => {
    return tasksWithContext.filter(item => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          item.subtask.name.toLowerCase().includes(query) ||
          item.taskName.toLowerCase().includes(query) ||
          item.sectionName.toLowerCase().includes(query);
        
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        switch (statusFilter) {
          case 'completed':
            return item.subtask.completed;
          case 'pending':
            return !item.subtask.completed && !item.isOverdue;
          case 'overdue':
            return item.isOverdue;
        }
      }

      return true;
    });
  }, [tasksWithContext, searchQuery, statusFilter]);

  // Apply sorting
  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'taskName':
          aValue = `${a.taskName} - ${a.subtask.name}`;
          bValue = `${b.taskName} - ${b.subtask.name}`;
          break;
        case 'sectionName':
          aValue = a.sectionName;
          bValue = b.sectionName;
          break;
        case 'createdWeek':
          aValue = a.subtask.created_at || '';
          bValue = b.subtask.created_at || '';
          break;
        case 'dueDate':
          aValue = a.subtask.due_on || '';
          bValue = b.subtask.due_on || '';
          break;
        case 'status':
          aValue = a.subtask.completed ? 'completed' : (a.isOverdue ? 'overdue' : 'pending');
          bValue = b.subtask.completed ? 'completed' : (b.isOverdue ? 'overdue' : 'pending');
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredTasks, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedTasks.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedTasks = sortedTasks.slice(startIndex, startIndex + pageSize);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const handleStatusFilter = (status: typeof statusFilter) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return dayjs(dateString).format('DD MMM YYYY');
  };

  const getStatusBadge = (item: TaskWithContext) => {
    if (item.subtask.completed) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          Completed
        </Badge>
      );
    } else if (item.isOverdue) {
      return (
        <Badge variant="destructive">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Overdue
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </Badge>
      );
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? 
      <ChevronUp className="w-4 h-4 ml-1" /> : 
      <ChevronDown className="w-4 h-4 ml-1" />;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <CardTitle>Current Tasks ({filteredTasks.length})</CardTitle>
          
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            
            {/* Status Filter */}
            <div className="flex space-x-2">
              {[
                { key: 'all', label: 'All' },
                { key: 'pending', label: 'Pending' },
                { key: 'completed', label: 'Completed' },
                { key: 'overdue', label: 'Overdue' },
              ].map(status => (
                <Button
                  key={status.key}
                  variant={statusFilter === status.key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleStatusFilter(status.key as typeof statusFilter)}
                >
                  {status.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {paginatedTasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No tasks found
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('taskName')}
                    >
                      <div className="flex items-center">
                        Task
                        <SortIcon field="taskName" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('sectionName')}
                    >
                      <div className="flex items-center">
                        Section
                        <SortIcon field="sectionName" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('createdWeek')}
                    >
                      <div className="flex items-center">
                        Created
                        <SortIcon field="createdWeek" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('dueDate')}
                    >
                      <div className="flex items-center">
                        Due Date
                        <SortIcon field="dueDate" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center">
                        Status
                        <SortIcon field="status" />
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTasks.map((item, index) => (
                    <TableRow key={`${item.subtask.gid}-${index}`}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-gray-900">
                            {item.taskName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {item.subtask.name}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.sectionName}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(item.subtask.created_at)}
                        </div>
                        <Tooltip>
                          <TooltipTrigger>
                            <div className="text-xs text-gray-500">
                              {item.createdWeek}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Start Week Date: {formatDate(item.createdWeek)}</p>
                          </TooltipContent>
                        </Tooltip>
                        
                      </TableCell>
                      <TableCell>
                        {formatDate(item.subtask.due_on)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(item)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-500">
                  Showing {startIndex + 1} to {Math.min(startIndex + pageSize, sortedTasks.length)} of {sortedTasks.length} tasks
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => 
                        page === 1 || 
                        page === totalPages || 
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      )
                      .map((page, index, array) => (
                        <div key={page}>
                          {index > 0 && array[index - 1] !== page - 1 && (
                            <span className="px-2 text-gray-400">...</span>
                          )}
                          <Button
                            variant={currentPage === page ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </Button>
                        </div>
                      ))}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}