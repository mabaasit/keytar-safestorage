import { useEffect, useState, useCallback, FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { UserData } from './user-storage';
import { v4 as uuidv4 } from 'uuid';

const App = () => {

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [users, setUsers] = useState<UserData[]>([]);

  const fetchUsers = useCallback(() => {
    (window as any).electronAPI.usersLoad().then((data: UserData[]) => {
      setUsers(data);
    });
  }, []);

  useEffect(() => {
    fetchUsers();
  }, []);

  const saveForm = useCallback((event: FormEvent) => {
    event.preventDefault();
    if (!name || !password) return;
    (window as any).electronAPI.usersSave({
      id: uuidv4(),
      name,
      password,
    });
    setName('');
    setPassword('');
    fetchUsers(); 
  }, [fetchUsers, name, password]);

  const deleteUser = useCallback(async (id: string) => {
    await (window as any).electronAPI.usersDelete(id);
    fetchUsers();
  }, [fetchUsers]);

  return (
    <div>
      <h2>Hello from React!</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Password</th>
            <th>ID</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user, index) => (
            <tr style={{border: '1px solid #ececec'}} key={index}>
              <td>{user.name}</td>
              <td>{user.password}</td>
              <td>{user.id}</td>
              <td>
                <button onClick={() => deleteUser(user.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <br />
      <hr />
      <br />

      <form onSubmit={saveForm}>
        <input onChange={e => setName(e.target.value)} value={name} type="text" placeholder="Enter your name" />
        <input onChange={e => setPassword(e.target.value)} value={password} type="password" placeholder="Enter your password" />
        <button type='submit' onClick={saveForm}>Submit</button>
      </form>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);