import React from 'react';
import ListPage from '../components/ListPage';
import FeedbackForm from '../forms/FeedbackForm';

export default function FeedbackPage() {
  return (
    <ListPage
      title="Feedback" description="Submit and manage your feedback, feature requests, and bug reports"
      apiEndpoint="/feedback" icon="💬" emptyIcon="💬" emptyTitle="No feedback yet"
      emptyDescription="Share your first piece of feedback with us"
      columns={[
        { key: 'type', label: 'Type', render: (v) => <span className={`badge ${v === 'bug' ? 'badge-danger' : v === 'feature' ? 'badge-info' : v === 'improvement' ? 'badge-warning' : 'badge-neutral'}`}>{v}</span> },
        { key: 'subject', label: 'Subject' },
        { key: 'rating', label: 'Rating', render: (v) => v ? '★'.repeat(v) + '☆'.repeat(5 - v) : '-' },
        { key: 'status', label: 'Status', render: (v) => <span className={`badge ${v === 'resolved' ? 'badge-success' : v === 'in_progress' ? 'badge-warning' : 'badge-info'}`}>{v}</span> },
        { key: 'created_at', label: 'Date', render: (v) => v ? new Date(v).toLocaleDateString() : '-' }
      ]}
      FormComponent={FeedbackForm}
    />
  );
}
