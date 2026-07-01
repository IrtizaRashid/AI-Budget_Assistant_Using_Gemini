import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { getCategories } from '../services/api.js';
import ChatBox from '../components/ChatBox.jsx';

export default function AIAssistantPage() {
  const { user } = useAuth();
  const userId = user?.id;
  const [categories, setCategories] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadCategories = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await getCategories(userId);
      const rows = Array.isArray(data)
        ? data.map((category) => ({
            category: category.category_name ?? category.category,
            allocated: Number(category.allocated_amount ?? category.allocated ?? 0),
            spent: Number(category.spent_amount ?? category.spent ?? 0),
            remaining:
              Number(category.allocated_amount ?? category.allocated ?? 0) -
              Number(category.spent_amount ?? category.spent ?? 0),
          }))
        : [];
      setCategories(rows);
    } catch {
      setCategories([]);
    }
  }, [userId]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories, refreshKey]);

  const handleDataChanged = () => {
    setRefreshKey((key) => key + 1);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">AI Assistant</h1>
      </div>

      <div className="mx-auto max-w-4xl">
        <ChatBox
          userId={userId}
          categories={categories}
          onDataChanged={handleDataChanged}
          onReallocationSaved={handleDataChanged}
        />
      </div>
    </div>
  );
}
