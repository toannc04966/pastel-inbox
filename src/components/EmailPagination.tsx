import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EmailPaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (value: number) => void;
  loading?: boolean;
}

export function EmailPagination({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  loading = false,
}: EmailPaginationProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  // Generate page numbers to display
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = [];
    
    if (totalPages <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      // Always show first page
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('ellipsis');
      }
      
      // Show pages around current
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('ellipsis');
      }
      
      // Always show last page
      pages.push(totalPages);
    }
    
    return pages;
  };
  
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);
  
  const handleItemsPerPageChange = (value: string) => {
    onItemsPerPageChange(Number(value));
    onPageChange(1); // Reset to first page when changing items per page
  };
  
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-3 px-3 border-t border-border/50">
      {/* Items per page selector */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Show</span>
        <Select
          value={String(itemsPerPage)}
          onValueChange={handleItemsPerPageChange}
          disabled={loading}
        >
          <SelectTrigger className="w-[70px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-muted-foreground">per page</span>
      </div>
      
      {/* Page info */}
      <div className="text-sm text-muted-foreground">
        {totalItems > 0 ? (
          <>Showing {startItem}-{endItem} of {totalItems} emails</>
        ) : (
          <>No emails</>
        )}
      </div>
      
      {/* Page numbers */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => !loading && currentPage > 1 && onPageChange(currentPage - 1)}
                className={currentPage === 1 || loading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
            
            {getPageNumbers().map((pageNum, idx) => (
              <PaginationItem key={idx}>
                {pageNum === 'ellipsis' ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink
                    onClick={() => !loading && onPageChange(pageNum)}
                    isActive={currentPage === pageNum}
                    className={loading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  >
                    {pageNum}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}
            
            <PaginationItem>
              <PaginationNext
                onClick={() => !loading && currentPage < totalPages && onPageChange(currentPage + 1)}
                className={currentPage === totalPages || loading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
