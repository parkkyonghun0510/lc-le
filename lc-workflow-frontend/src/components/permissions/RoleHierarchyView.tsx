"use client";

import React from 'react';
import { ChevronRightIcon, ChevronDownIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

interface Role {
  id: string;
  name: string;
  display_name: string;
  description: string;
  level: number;
  is_active: boolean;
  is_system_role: boolean;
  is_default: boolean;
  parent_role_id?: string;
  permission_count: number;
  created_at: string;
  updated_at: string;
}

interface RoleHierarchyViewProps {
  roles: Role[];
  onRoleSelect?: (role: Role) => void;
  selectedRoleId?: string;
}

interface RoleNode extends Role {
  children: RoleNode[];
}

export default function RoleHierarchyView({ roles, onRoleSelect, selectedRoleId }: RoleHierarchyViewProps) {
  const [expandedNodes, setExpandedNodes] = React.useState<Set<string>>(new Set());

  // Build hierarchy tree
  const buildHierarchy = (roles: Role[]): RoleNode[] => {
    const roleMap = new Map<string, RoleNode>();
    const rootNodes: RoleNode[] = [];

    // Create nodes
    roles.forEach(role => {
      roleMap.set(role.id, { ...role, children: [] });
    });

    // Build tree structure
    roles.forEach(role => {
      const node = roleMap.get(role.id)!;
      if (role.parent_role_id && roleMap.has(role.parent_role_id)) {
        const parent = roleMap.get(role.parent_role_id)!;
        parent.children.push(node);
      } else {
        rootNodes.push(node);
      }
    });

    // Sort by level (descending) and then by name
    const sortNodes = (nodes: RoleNode[]) => {
      nodes.sort((a, b) => {
        if (a.level !== b.level) return b.level - a.level;
        return a.display_name.localeCompare(b.display_name);
      });
      nodes.forEach(node => sortNodes(node.children));
    };

    sortNodes(rootNodes);
    return rootNodes;
  };

  const hierarchy = buildHierarchy(roles);

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const expandAll = () => {
    const allIds = new Set(roles.map(r => r.id));
    setExpandedNodes(allIds);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  const RoleTreeNode = ({ node, depth = 0 }: { node: RoleNode; depth?: number }) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = selectedRoleId === node.id;

    return (
      <div>
        <div
          className={`flex items-center py-2 px-3 hover:bg-gray-50 cursor-pointer rounded ${
            isSelected ? 'bg-indigo-50 border-l-4 border-indigo-600' : ''
          }`}
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
          onClick={() => onRoleSelect?.(node)}
        >
          {/* Expand/Collapse Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (hasChildren) toggleNode(node.id);
            }}
            className={`mr-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded ${
              !hasChildren ? 'invisible' : ''
            }`}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {hasChildren && (
              isExpanded ? (
                <ChevronDownIcon className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronRightIcon className="h-4 w-4 text-gray-500" />
              )
            )}
          </button>

          {/* Role Icon */}
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
              node.is_active
                ? 'bg-indigo-100 text-indigo-600'
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            <ShieldCheckIcon className="h-4 w-4" />
          </div>

          {/* Role Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900 truncate">
                {node.display_name}
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  node.level >= 80
                    ? 'bg-red-100 text-red-800'
                    : node.level >= 60
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-green-100 text-green-800'
                }`}
              >
                L{node.level}
              </span>
              {node.is_system_role && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  System
                </span>
              )}
              {!node.is_active && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                  Inactive
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {node.permission_count} permissions
            </div>
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {node.children.map(child => (
              <RoleTreeNode key={child.id} node={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">Role Hierarchy</h3>
          <div className="flex gap-2">
            <button
              onClick={expandAll}
              className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
            >
              Collapse All
            </button>
          </div>
        </div>
      </div>

      {/* Tree */}
      <div className="p-2 max-h-96 overflow-y-auto">
        {hierarchy.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <ShieldCheckIcon className="h-12 w-12 mx-auto text-gray-300 mb-2" />
            <p className="text-sm">No roles to display</p>
          </div>
        ) : (
          hierarchy.map(node => <RoleTreeNode key={node.id} node={node} />)
        )}
      </div>
    </div>
  );
}
