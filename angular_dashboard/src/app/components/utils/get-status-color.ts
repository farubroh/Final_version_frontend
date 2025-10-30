export function getStatusColor(status: string): string {
  switch (status) {
    case 'PENDING': return '#ffc107';
    case 'INPROGRESS': return '#17a2b8';
    case 'COMPLETED': return '#28a745';
    case 'REJECTED': return '#dc3545';
    default: return '#6c757d';
  }
}