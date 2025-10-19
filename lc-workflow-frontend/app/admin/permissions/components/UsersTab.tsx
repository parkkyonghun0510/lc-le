'use client';

import { useState } from 'react';

export default function UsersTab() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">User Permission Assignment</h3>
        <div className="flex space-x-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for a user..."
            className="flex-1 border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Search
          </button>
        </div>
      </div>

      {/* Placeholder */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg mb-2">Search for a user to manage their permissions</p>
          <p className="text-sm">You can assign roles and grant direct permissions</p>
        </div>
      </div>
    </div>
  );
}
