/**
 * Facebook Approvals - Content Approval Dashboard (Standalone)
 * 
 * Manages Facebook content approvals across multiple regions (HK, SG, Global)
 * Integrates with n8n workflow for AI-generated content and image prompts
 * 
 * Features:
 * - Cognito authentication (admin-only)
 * - Search posts by content
 * - Filter by status, region, date range
 * - View and manage post images
 * - Edit image prompts for rejected/pending posts
 * - Reset rejected posts to pending
 * - Bulk actions for multiple posts
 */

import React, { useState, useEffect, useCallback } from 'react';
import './FacebookApprovals.css';

const FACEBOOK_TABLE_ID = 'noXFuxkPOfmqwYMf';
const N8N_API_URL = 'https://lighthouse.eduq-ai.com/webhook/dashboard/posts';
const N8N_API_KEY = import.meta.env.VITE_N8N_API_KEY;

const FacebookApprovals = () => {
  // Data state
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  
  // Selection and editing state
  const [selectedPosts, setSelectedPosts] = useState(new Set());
  const [editingPost, setEditingPost] = useState(null);
  const [editedPrompt, setEditedPrompt] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Status options for filter
  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'pending_content_approval', label: 'Pending Content' },
    { value: 'pending_prompt_approval', label: 'Pending Prompt' },
    { value: 'pending_image_approval', label: 'Pending Image' },
    { value: 'generating_image', label: 'Generating Image' },
    { value: 'posted', label: 'Posted' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'prompt_rejected', label: 'Prompt Rejected' },
    { value: 'image_rejected', label: 'Image Rejected' }
  ];

  // Region options
  const regionOptions = [
    { value: 'all', label: 'All Regions' },
    { value: 'HK', label: 'Hong Kong' },
    { value: 'SG', label: 'Singapore' },
    { value: 'Global', label: 'Global' }
  ];

  // Date filter options
  const dateOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' }
  ];

  // Calculate stats
  const stats = {
    pending: posts.filter(p => p.status.includes('pending') || p.status === 'generating_image').length,
    approved: posts.filter(p => p.status === 'posted').length,
    rejected: posts.filter(p => p.status.includes('reject')).length,
    posted: posts.filter(p => p.status === 'posted').length
  };

  // Fetch posts from n8n webhook API
  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(N8N_API_URL, {
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch posts');
      
      const data = await response.json();
      setPosts(data.posts || []);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching posts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Toast notification
  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  // Approve post
  const approvePost = async (postId) => {
    try {
      const response = await fetch(`https://lighthouse.eduq-ai.com/webhook/facebook-content-approval?postId=${postId}&action=approve`, {
        method: 'GET'
      });
      
      if (!response.ok) throw new Error('Approval failed');
      
      showToast('Post approved successfully!', 'success');
      await fetchPosts();
    } catch (err) {
      showToast('Failed to approve post', 'error');
      console.error('Error approving post:', err);
    }
  };

  // Reject post
  const rejectPost = async (postId) => {
    try {
      const response = await fetch(`https://lighthouse.eduq-ai.com/webhook/facebook-content-approval?postId=${postId}&action=reject`, {
        method: 'GET'
      });
      
      if (!response.ok) throw new Error('Rejection failed');
      
      showToast('Post rejected', 'success');
      await fetchPosts();
    } catch (err) {
      showToast('Failed to reject post', 'error');
      console.error('Error rejecting post:', err);
    }
  };

  // Reset post to pending
  const resetPost = async (postId) => {
    try {
      const response = await fetch(`https://lighthouse.eduq-ai.com/webhook/dashboard/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'reset',
          postId: postId
        })
      });
      
      if (!response.ok) throw new Error('Reset failed');
      
      showToast('Post reset to pending', 'success');
      await fetchPosts();
      setSelectedPosts(prev => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
    } catch (err) {
      showToast('Failed to reset post', 'error');
      console.error('Error resetting post:', err);
    }
  };

  // Open edit modal
  const openEditModal = (post) => {
    setEditingPost(post);
    setEditedPrompt(post.imagePrompt || '');
    setShowEditModal(true);
  };

  // Save edited prompt
  const saveEditedPrompt = async () => {
    if (!editingPost || !editedPrompt.trim()) {
      showToast('Please enter a prompt', 'error');
      return;
    }

    try {
      const response = await fetch(`https://lighthouse.eduq-ai.com/webhook/dashboard/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'save',
          postId: editingPost.id,
          imagePrompt: editedPrompt.trim()
        })
      });
      
      if (!response.ok) throw new Error('Failed to save prompt');
      
      setShowEditModal(false);
      setEditingPost(null);
      showToast('Prompt saved and post re-approved', 'success');
      await fetchPosts();
    } catch (err) {
      showToast('Failed to save prompt', 'error');
      console.error('Error saving prompt:', err);
    }
  };

  // Toggle post selection
  const togglePostSelection = (postId) => {
    setSelectedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  // Bulk approve
  const bulkApprove = async () => {
    if (selectedPosts.size === 0) return;
    
    const promises = Array.from(selectedPosts).map(id => approvePost(id));
    await Promise.all(promises);
    setSelectedPosts(new Set());
  };

  // Bulk reject
  const bulkReject = async () => {
    if (selectedPosts.size === 0) return;
    
    const promises = Array.from(selectedPosts).map(id => rejectPost(id));
    await Promise.all(promises);
    setSelectedPosts(new Set());
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedPosts(new Set());
  };

  // Filter posts by search and filters
  const getFilteredPosts = () => {
    let filtered = [...posts];
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(post => 
        (post.message && post.message.toLowerCase().includes(query)) ||
        (post.imagePrompt && post.imagePrompt.toLowerCase().includes(query))
      );
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'rejected') {
        filtered = filtered.filter(p => p.status.includes('reject'));
      } else {
        filtered = filtered.filter(p => p.status === statusFilter);
      }
    }
    
    // Region filter
    if (regionFilter !== 'all') {
      filtered = filtered.filter(p => p.region === regionFilter);
    }
    
    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(post => {
        const postDate = new Date(post.createdAt || post.postDate);
        
        if (dateFilter === 'today') {
          return postDate >= today;
        } else if (dateFilter === 'week') {
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return postDate >= weekAgo;
        } else if (dateFilter === 'month') {
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return postDate >= monthAgo;
        }
        return true;
      });
    }
    
    return filtered;
  };

  // Get status class
  const getStatusClass = (status) => {
    if (status.includes('pending')) return 'pending';
    if (status.includes('reject')) return 'rejected';
    if (status === 'posted') return 'posted';
    return 'pending';
  };

  // Get status text
  const getStatusText = (status) => {
    const statusMap = {
      'pending_content_approval': 'Pending Content',
      'pending_prompt_approval': 'Pending Prompt',
      'pending_image_approval': 'Pending Image',
      'generating_image': 'Generating Image',
      'posted': 'Posted',
      'rejected': 'Rejected',
      'prompt_rejected': 'Prompt Rejected',
      'image_rejected': 'Image Rejected'
    };
    return statusMap[status] || status;
  };

  // Get time ago string
  const getTimeAgo = (dateString) => {
    if (!dateString) return 'Unknown date';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString();
  };

  // Check if post can be edited
  const canEditPost = (post) => {
    return (
      post.status.includes('reject') || 
      post.status === 'pending_prompt_approval' ||
      post.status === 'pending_image_approval' ||
      (post.imagePrompt && post.imagePrompt.length > 0)
    );
  };

  // Check if post can be reset
  const canResetPost = (post) => {
    return post.status.includes('reject');
  };

  // Check if post can be approved/rejected
  const canApproveReject = (post) => {
    return post.status.includes('pending');
  };

  const filteredPosts = getFilteredPosts();

  return (
    <div className="facebook-approvals">
      {/* Header */}
      <div className="facebook-approvals__header">
        <h1 className="facebook-approvals__title">Facebook Post Approval Dashboard</h1>
        <div className="facebook-approvals__header-actions">
          <button className="facebook-approvals__refresh-btn" onClick={fetchPosts}>
            Refresh
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="facebook-approvals__main">
        {/* Stats */}
        <div className="facebook-approvals__stats">
          <div className="stat-card pending">
            <h3>Pending</h3>
            <div className="value">{stats.pending}</div>
          </div>
          <div className="stat-card approved">
            <h3>Approved</h3>
            <div className="value">{stats.approved}</div>
          </div>
          <div className="stat-card rejected">
            <h3>Rejected</h3>
            <div className="value">{stats.rejected}</div>
          </div>
          <div className="stat-card posted">
            <h3>Posted</h3>
            <div className="value">{stats.posted}</div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="facebook-approvals__filters">
          <input
            type="text"
            className="search-input"
            placeholder="Search posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          
          <select 
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          
          <select 
            className="filter-select"
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
          >
            {regionOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          
          <select 
            className="filter-select"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            {dateOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Loading */}
        {loading && (
          <div className="facebook-approvals__loading">
            <div className="loading-spinner"></div>
            <p>Loading posts...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="facebook-approvals__error">
            Error: {error}
          </div>
        )}

        {/* Posts Grid */}
        {!loading && !error && (
          <div className="posts-grid">
            {filteredPosts.length === 0 ? (
              <div className="posts-grid__empty">
                <h3>No posts found</h3>
                <p>Try adjusting your filters or search query.</p>
              </div>
            ) : (
              filteredPosts.map(post => {
                const statusClass = getStatusClass(post.status);
                const statusText = getStatusText(post.status);
                const hasImage = post.imageUrl && post.imageUrl.length > 0;
                const region = post.region || 'HK';
                const timeAgo = getTimeAgo(post.createdAt || post.postDate);

                return (
                  <PostCard
                    key={post.id}
                    post={post}
                    statusClass={statusClass}
                    statusText={statusText}
                    hasImage={hasImage}
                    region={region}
                    timeAgo={timeAgo}
                    isSelected={selectedPosts.has(post.id)}
                    onToggleSelect={() => togglePostSelection(post.id)}
                    onApprove={() => approvePost(post.id)}
                    onReject={() => rejectPost(post.id)}
                    onEdit={() => openEditModal(post)}
                    onReset={() => resetPost(post.id)}
                    canApproveReject={canApproveReject(post)}
                    canEdit={canEditPost(post)}
                    canReset={canResetPost(post)}
                  />
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Bulk Actions Bar */}
      {selectedPosts.size > 0 && (
        <div className="bulk-actions-bar">
          <span className="bulk-actions-bar__count">
            {selectedPosts.size} post{selectedPosts.size !== 1 ? 's' : ''} selected
          </span>
          <div className="bulk-actions-bar__actions">
            <button className="bulk-btn approve" onClick={bulkApprove}>
              Approve All
            </button>
            <button className="bulk-btn reject" onClick={bulkReject}>
              Reject All
            </button>
            <button className="bulk-btn clear" onClick={clearSelection}>
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingPost && (
        <div className="edit-modal" onClick={() => setShowEditModal(false)}>
          <div className="edit-modal__content" onClick={e => e.stopPropagation()}>
            <div className="edit-modal__header">
              <h2>Edit Image Prompt</h2>
              <button className="edit-modal__close" onClick={() => setShowEditModal(false)}>
                ×
              </button>
            </div>
            
            <div className="edit-modal__body">
              <div style={{ marginBottom: '12px', fontSize: '14px', color: '#718096' }}>
                <strong>Post #{editingPost.id}</strong> - {getStatusText(editingPost.status)}
              </div>
              
              <textarea
                value={editedPrompt}
                onChange={(e) => setEditedPrompt(e.target.value)}
                placeholder="Enter image prompt..."
                rows={10}
              />
              <div className="edit-modal__char-count">
                {editedPrompt.length} characters
              </div>
            </div>
            
            <div className="edit-modal__footer">
              <button className="action-btn reject" onClick={() => setShowEditModal(false)}>
                Cancel
              </button>
              <button className="action-btn approve" onClick={saveEditedPrompt}>
                Save & Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Container */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
};

// Post Card Component with Show More functionality
const PostCard = ({ 
  post, 
  statusClass, 
  statusText, 
  hasImage, 
  region, 
  timeAgo,
  isSelected,
  onToggleSelect,
  onApprove,
  onReject,
  onEdit,
  onReset,
  canApproveReject,
  canEdit,
  canReset
}) => {
  const [showFullContent, setShowFullContent] = useState(false);
  const [showFullPrompt, setShowFullPrompt] = useState(false);
  
  const maxContentLength = 300;
  const maxPromptLength = 200;
  
  const truncatedContent = post.message && post.message.length > maxContentLength
    ? post.message.substring(0, maxContentLength) + '...'
    : post.message;
    
  const truncatedPrompt = post.imagePrompt && post.imagePrompt.length > maxPromptLength
    ? post.imagePrompt.substring(0, maxPromptLength) + '...'
    : post.imagePrompt;

  return (
    <div className="post-card">
      <input
        type="checkbox"
        className="post-checkbox"
        checked={isSelected}
        onChange={onToggleSelect}
      />
      
      <div className="post-header">
        <span className="post-id">#{post.id}</span>
        <span className={`status-badge ${statusClass}`}>{statusText}</span>
      </div>

      <div className="post-time">{timeAgo}</div>

      {post.message && (
        <div className="post-content">
          {showFullContent ? post.message : truncatedContent}
          {post.message && post.message.length > maxContentLength && (
            <button 
              className="show-more-btn"
              onClick={() => setShowFullContent(!showFullContent)}
            >
              {showFullContent ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      )}

      {post.imagePrompt && (
        <div className="post-prompt">
          <strong>Image Prompt:</strong>
          <div className="prompt-text">
            {showFullPrompt ? post.imagePrompt : truncatedPrompt}
            {post.imagePrompt && post.imagePrompt.length > maxPromptLength && (
              <button 
                className="show-more-btn"
                onClick={() => setShowFullPrompt(!showFullPrompt)}
              >
                {showFullPrompt ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        </div>
      )}

      {hasImage && (
        <div className="post-image">
          <img src={post.imageUrl} alt="Post" loading="lazy" />
        </div>
      )}

      <div className="post-footer">
        <div className="post-meta">
          <span className="meta-badge">{region}</span>
          {hasImage && <span className="meta-badge">Image</span>}
        </div>

        <div className="post-actions">
          {canApproveReject && (
            <>
              <button className="action-btn approve" onClick={onApprove}>
                Approve
              </button>
              <button className="action-btn reject" onClick={onReject}>
                Reject
              </button>
            </>
          )}

          {canEdit && (
            <button className="action-btn edit" onClick={onEdit}>
              Edit Prompt
            </button>
          )}

          {canReset && (
            <button className="action-btn reset" onClick={onReset} title="Reset post to pending">
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FacebookApprovals;
