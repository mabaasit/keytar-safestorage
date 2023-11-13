import 'bootstrap/dist/css/bootstrap.min.css';

import { useEffect, useState, useCallback, FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { Container, Row, Table, Card, Form, Button } from 'react-bootstrap';
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
    <Container style={{marginTop: '20px'}}>
      <Row>
        <Table striped bordered hover>
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
                  <Button variant='danger' onClick={() => deleteUser(user.id)}>Delete</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Row>

      <Row>
        <Card style={{padding: '20px 10px'}}>
          <Form onSubmit={saveForm}>
            <Form.Group className="mb-3">
              <Form.Label htmlFor='name'>Name</Form.Label>
              <Form.Control id='name' onChange={e => setName(e.target.value)} value={name} type="text" placeholder="Jane" />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label htmlFor='password'>Password</Form.Label>
              <Form.Control id='password' onChange={e => setPassword(e.target.value)} value={password} type="password" placeholder="********" />
            </Form.Group>
            <Button onClick={saveForm} variant="primary" type="submit">
              Submit
            </Button>
          </Form>
        </Card>
      </Row>
    </Container>
  );
}

createRoot(document.getElementById('root')).render(<App />);