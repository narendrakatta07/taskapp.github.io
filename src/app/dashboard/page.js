"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { CheckCircle, Circle, Trash2, LogOut, Clock, PlusCircle } from "lucide-react";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchTasks();
    }
  }, [status, router]);

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/tasks");
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (error) {
      console.error("Failed to fetch tasks", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, deadline }),
      });
      if (res.ok) {
        setTitle("");
        setDescription("");
        setDeadline("");
        fetchTasks();
      }
    } catch (error) {
      console.error("Failed to create task", error);
    }
  };

  const toggleTaskStatus = async (id, currentStatus) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: !currentStatus }),
      });
      if (res.ok) {
        fetchTasks();
      }
    } catch (error) {
      console.error("Failed to update task", error);
    }
  };

  const deleteTask = async (id) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchTasks();
      }
    } catch (error) {
      console.error("Failed to delete task", error);
    }
  };

  if (status === "loading" || loading) {
    return <div className="container flex items-center justify-center" style={{ minHeight: '100vh' }}>Loading...</div>;
  }

  const isOverdue = (dateString) => {
    if (!dateString) return false;
    return new Date(dateString) < new Date();
  };

  return (
    <>
      <nav className="navbar">
        <div className="logo">Task<span>Flow</span></div>
        <div className="flex items-center gap-4">
          <span style={{ color: 'var(--text-secondary)' }}>Hello, {session?.user?.name || session?.user?.email}</span>
          <button onClick={() => signOut()} className="btn btn-danger" style={{ padding: '0.5rem 1rem' }}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </nav>

      <div className="container mt-4">
        <div className="flex flex-col gap-4" style={{ md: { flexDirection: 'row' }}}>
          
          {/* Task Creation Form */}
          <div className="card animate-fade-in" style={{ flex: '1', height: 'fit-content' }}>
            <h3 className="mb-4 flex items-center gap-2"><PlusCircle size={20} color="var(--accent-color)" /> Create New Task</h3>
            <form onSubmit={handleCreateTask} className="flex flex-col gap-4">
              <div>
                <label className="mb-2" style={{ display: 'block' }}>Title</label>
                <input 
                  type="text" 
                  placeholder="Task title" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required 
                />
              </div>
              <div>
                <label className="mb-2" style={{ display: 'block' }}>Description</label>
                <textarea 
                  placeholder="Task description (optional)" 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div>
                <label className="mb-2" style={{ display: 'block' }}>Deadline</label>
                <input 
                  type="datetime-local" 
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary mt-4">Add Task</button>
            </form>
          </div>

          {/* Task List */}
          <div className="card animate-fade-in" style={{ flex: '2' }}>
            <h3 className="mb-4">Your Tasks</h3>
            {tasks.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No tasks found. Create one to get started!</p>
            ) : (
              <div className="flex flex-col gap-4">
                {tasks.map(task => (
                  <div key={task.id} className="flex items-center justify-between" style={{
                    padding: '1rem',
                    background: 'var(--bg-color)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    borderLeft: `4px solid ${task.isCompleted ? 'var(--success-color)' : (isOverdue(task.deadline) ? 'var(--danger-color)' : 'var(--accent-color)')}`
                  }}>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => toggleTaskStatus(task.id, task.isCompleted)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}
                      >
                        {task.isCompleted ? <CheckCircle size={24} color="var(--success-color)" /> : <Circle size={24} color="var(--text-secondary)" />}
                      </button>
                      <div>
                        <h4 style={{ textDecoration: task.isCompleted ? 'line-through' : 'none', color: task.isCompleted ? 'var(--text-secondary)' : 'var(--text-primary)', marginBottom: '0.2rem' }}>{task.title}</h4>
                        {task.description && <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>{task.description}</p>}
                        {task.deadline && (
                          <div className="flex items-center gap-2" style={{ fontSize: '0.8rem', color: task.isCompleted ? 'var(--text-secondary)' : (isOverdue(task.deadline) ? 'var(--danger-color)' : 'var(--accent-color)') }}>
                            <Clock size={14} /> 
                            {new Date(task.deadline).toLocaleString()} {isOverdue(task.deadline) && !task.isCompleted && "(Overdue)"}
                          </div>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={() => deleteTask(task.id)}
                      className="btn btn-danger"
                      style={{ padding: '0.5rem', border: 'none' }}
                      title="Delete Task"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
