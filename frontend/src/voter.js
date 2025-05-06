import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import EquipmentLendingABI from './EquipmentLendingABI.json';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import logo from './logo.png';

const CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [equipmentList, setEquipmentList] = useState([]);
  const [requests, setRequests] = useState([]);
  const [userRequests, setUserRequests] = useState([]);
  const [menu, setMenu] = useState('dashboard');
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Equipment management
  const [equipName, setEquipName] = useState('');
  const [equipQuantity, setEquipQuantity] = useState(1);
  const [equipDailyPrice, setEquipDailyPrice] = useState(0);
  const [editEquipId, setEditEquipId] = useState(null);
  
  // Request management
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [durationDays, setDurationDays] = useState(1);
  const [adminComment, setAdminComment] = useState('');
  
  // Admin system
  const [isAdmin, setIsAdmin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    document.title = "Equipment Lending DApp";
    const link = document.querySelector("link[rel~='icon']") || document.createElement('link');
    link.rel = 'icon';
    link.href = './favicon.ico';
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    const savedAdmin = localStorage.getItem('isAdmin');
    if (savedAdmin === 'true') setIsAdmin(true);
  }, []);

  useEffect(() => {
    const init = async () => {
      if (!window.ethereum) return alert('MetaMask is required');
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await browserProvider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, EquipmentLendingABI, signer);
      const address = await signer.getAddress();

      setProvider(browserProvider);
      setSigner(signer);
      setContract(contract);
      setAccount(address);
      
      // Check if user is owner
      const owner = await contract.owner();
      if (address.toLowerCase() === owner.toLowerCase()) {
        setIsAdmin(true);
        localStorage.setItem('isAdmin', 'true');
      }
      
      loadData(contract, address);
    };
    init();
  }, []);

  const loadData = async (contractInstance = contract, userAddress = account) => {
    if (!contractInstance || !userAddress) return;
    try {
      // Load equipment
      const count = await contractInstance.getEquipmentCount();
      const equipments = [];
      for (let i = 1; i <= count; i++) {
        const [id, name, quantity, dailyPrice, isAvailable] = await contractInstance.getEquipmentDetails(i);
        equipments.push({
          id: id.toString(),
          name,
          quantity: quantity.toString(),
          dailyPrice: ethers.formatEther(dailyPrice),
          isAvailable
        });
      }
      setEquipmentList(equipments);

      // Load all requests (admin) or user requests
      const requestCount = await contractInstance.getRequestCount();
      const allRequests = [];
      const userReqs = [];
      
      for (let i = 1; i <= requestCount; i++) {
        const req = await contractInstance.getRequestDetails(i);
        const request = {
          id: req[0].toString(),
          equipmentId: req[1].toString(),
          borrower: req[2],
          equipmentName: req[3],
          requestDate: new Date(Number(req[4]) * 1000).toLocaleString(),
          dueDate: new Date(Number(req[5]) * 1000).toLocaleString(),
          totalPrice: ethers.formatEther(req[6]),
          dailyPrice: ethers.formatEther(req[7]),
          status: req[8], // RequestStatus enum
          adminComment: req[9]
        };
        
        allRequests.push(request);
        if (req[2].toLowerCase() === userAddress.toLowerCase()) {
          userReqs.push(request);
        }
      }
      
      setRequests(allRequests);
      setUserRequests(userReqs);
      
    } catch (err) {
      showMessage('danger', 'Failed to load data.');
      console.error(err);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (username === 'admin' && password === 'admin123') {
      setIsAdmin(true);
      localStorage.setItem('isAdmin', 'true');
      setMenu('equipment');
      showMessage('success', 'Admin login successful!');
      setUsername('');
      setPassword('');
    } else {
      showMessage('danger', 'Invalid credentials');
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    localStorage.removeItem('isAdmin');
    setMenu('dashboard');
    showMessage('success', 'Logged out successfully');
  };

  const handleAddEquipment = async () => {
    try {
      await contract.addEquipment(
        equipName,
        equipQuantity,
        ethers.parseEther(equipDailyPrice.toString())
      );
      setEquipName('');
      setEquipQuantity(1);
      setEquipDailyPrice(0);
      showMessage('success', 'Equipment added successfully.');
      loadData();
    } catch (err) {
      showMessage('danger', 'Error adding equipment.');
      console.error(err);
    }
  };

  const handleUpdateEquipment = async (id) => {
    try {
      await contract.updateEquipment(
        id,
        equipName,
        equipQuantity,
        ethers.parseEther(equipDailyPrice.toString())
      );
      setEditEquipId(null);
      setEquipName('');
      setEquipQuantity(1);
      setEquipDailyPrice(0);
      showMessage('success', 'Equipment updated.');
      loadData();
    } catch (err) {
      showMessage('danger', 'Failed to update equipment.');
      console.error(err);
    }
  };

  const handleRemoveEquipment = async (id) => {
    try {
      await contract.removeEquipment(id);
      showMessage('success', 'Equipment removed.');
      loadData();
    } catch (err) {
      showMessage('danger', 'Failed to remove equipment.');
      console.error(err);
    }
  };

  const handleRequestEquipment = async () => {
    try {
      const selectedEquip = equipmentList.find(e => e.id === selectedEquipment);
      const totalPrice = ethers.parseEther(
        (parseFloat(selectedEquip.dailyPrice) * durationDays).toString()
      );
      
      const tx = await contract.requestEquipment(
        selectedEquipment,
        durationDays,
        { value: totalPrice }
      );
      await tx.wait();
      
      setSelectedEquipment('');
      setDurationDays(1);
      showMessage('success', 'Request submitted successfully.');
      loadData();
    } catch (err) {
      showMessage('danger', 'Failed to submit request.');
      console.error(err);
    }
  };

  const handleProcessRequest = async (requestId, approve) => {
    try {
      await contract.processRequest(
        requestId,
        approve,
        adminComment
      );
      setAdminComment('');
      showMessage('success', `Request ${approve ? 'approved' : 'rejected'}.`);
      loadData();
    } catch (err) {
      showMessage('danger', 'Failed to process request.');
      console.error(err);
    }
  };

  const handleReturnEquipment = async (requestId) => {
    try {
      await contract.returnEquipment(requestId);
      showMessage('success', 'Return initiated.');
      loadData();
    } catch (err) {
      showMessage('danger', 'Failed to initiate return.');
      console.error(err);
    }
  };

  const handleConfirmReturn = async (requestId) => {
    try {
      await contract.confirmReturn(requestId);
      showMessage('success', 'Return confirmed.');
      loadData();
    } catch (err) {
      showMessage('danger', 'Failed to confirm return.');
      console.error(err);
    }
  };

  const renderCard = (title, content) => (
    <div className="card mb-3">
      <div className="card-header text-white bg-primary">{title}</div>
      <div className="card-body">{content}</div>
    </div>
  );

  const renderStatusBadge = (status) => {
    const statusMap = {
      0: { text: 'Pending', class: 'bg-warning' },
      1: { text: 'Approved', class: 'bg-success' },
      2: { text: 'Rejected', class: 'bg-danger' },
      3: { text: 'Returned', class: 'bg-info' }
    };
    return (
      <span className={`badge ${statusMap[status].class}`}>
        {statusMap[status].text}
      </span>
    );
  };

  return (
    <div className="container mt-4">
      <div className="text-center mb-4">
        <img src={logo} alt="Equipment Lending Logo" style={{ width: '100px', marginBottom: '1rem' }} />
        <h3>Equipment Lending System</h3>
        <p className="text-muted">Connected Account: {account}</p>
      </div>

      {message.text && (
        <div className={`alert alert-${message.type} text-center`} role="alert">
          {message.text}
        </div>
      )}

      <ul className="nav nav-tabs mb-3">
        {isAdmin && (
          <>
            <li className="nav-item">
              <button className={`nav-link ${menu === 'equipment' ? 'active' : ''}`} 
                onClick={() => setMenu('equipment')}>
                <i className="bi bi-tools me-1"></i>Equipment
              </button>
            </li>
            <li className="nav-item">
              <button className={`nav-link ${menu === 'requests' ? 'active' : ''}`} 
                onClick={() => setMenu('requests')}>
                <i className="bi bi-list-check me-1"></i>Requests
              </button>
            </li>
          </>
        )}
        <li className="nav-item">
          <button className={`nav-link ${menu === 'dashboard' ? 'active' : ''}`} 
            onClick={() => setMenu('dashboard')}>
            <i className="bi bi-house me-1"></i>Dashboard
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${menu === 'my-requests' ? 'active' : ''}`} 
            onClick={() => setMenu('my-requests')}>
            <i className="bi bi-person-lines-fill me-1"></i>My Requests
          </button>
        </li>
        <li className="nav-item" style={{ marginLeft: 'auto' }}>
          {!isAdmin ? (
            <button 
              className={`nav-link ${menu === 'login' ? 'active' : ''}`} 
              onClick={() => setMenu('login')}
              style={{ backgroundColor: '#dc3545', color: 'white', borderRadius: '5px' }}
            >
              <i className="bi bi-shield-lock me-1"></i>Admin Login
            </button>
          ) : (
            <button 
              className="nav-link" 
              onClick={handleLogout}
              style={{ backgroundColor: '#dc3545', color: 'white', borderRadius: '5px' }}
            >
              <i className="bi bi-box-arrow-right me-1"></i>Logout
            </button>
          )}
        </li>
      </ul>

      {menu === 'login' && (
        <div className="card mx-auto mb-4" style={{ maxWidth: '400px' }}>
          <div className="card-header bg-danger text-white">
            <h5 className="mb-0 text-center">Admin Login</h5>
          </div>
          <div className="card-body">
            <form onSubmit={handleAdminLogin}>
              <div className="mb-3">
                <label className="form-label">Username</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  required 
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Password</label>
                <input 
                  type="password" 
                  className="form-control" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                />
              </div>
              <div className="d-grid">
                <button type="submit" className="btn btn-danger">
                  <i className="bi bi-shield-lock me-1"></i>Login
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {menu === 'equipment' && isAdmin &&
        renderCard('Manage Equipment', (
          <>
            <div className="row mb-3">
              <div className="col-md-4">
                <input 
                  value={equipName} 
                  onChange={(e) => setEquipName(e.target.value)} 
                  className="form-control" 
                  placeholder="Equipment Name" 
                />
              </div>
              <div className="col-md-2">
                <input 
                  type="number" 
                  min="1"
                  value={equipQuantity} 
                  onChange={(e) => setEquipQuantity(e.target.value)} 
                  className="form-control" 
                  placeholder="Quantity" 
                />
              </div>
              <div className="col-md-3">
                <div className="input-group">
                  <input 
                    type="number" 
                    min="0.01"
                    step="0.01"
                    value={equipDailyPrice} 
                    onChange={(e) => setEquipDailyPrice(e.target.value)} 
                    className="form-control" 
                    placeholder="Daily Price" 
                  />
                  <span className="input-group-text">ETH</span>
                </div>
              </div>
              <div className="col-md-3">
                <button 
                  className="btn btn-success w-100"
                  onClick={editEquipId ? () => handleUpdateEquipment(editEquipId) : handleAddEquipment}
                >
                  {editEquipId ? 'Update Equipment' : 'Add Equipment'}
                </button>
              </div>
            </div>
            
            <table className="table table-sm table-bordered">
              <thead className="table-light">
                <tr>
                  <th>Equipment</th>
                  <th>Quantity</th>
                  <th>Daily Price</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {equipmentList.map((equip) => (
                  <tr key={equip.id}>
                    {editEquipId === equip.id ? (
                      <>
                        <td>
                          <input
                            className="form-control form-control-sm"
                            value={equipName}
                            onChange={(e) => setEquipName(e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            className="form-control form-control-sm"
                            value={equipQuantity}
                            onChange={(e) => setEquipQuantity(e.target.value)}
                          />
                        </td>
                        <td>
                          <div className="input-group input-group-sm">
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              className="form-control"
                              value={equipDailyPrice}
                              onChange={(e) => setEquipDailyPrice(e.target.value)}
                            />
                            <span className="input-group-text">ETH</span>
                          </div>
                        </td>
                        <td>{equip.isAvailable ? 'Available' : 'Unavailable'}</td>
                        <td>
                          <button
                            className="btn btn-primary btn-sm me-1"
                            onClick={() => handleUpdateEquipment(equip.id)}
                          >
                            Save
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setEditEquipId(null);
                              setEquipName('');
                              setEquipQuantity(1);
                              setEquipDailyPrice(0);
                            }}
                          >
                            Cancel
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{equip.name}</td>
                        <td>{equip.quantity}</td>
                        <td>{equip.dailyPrice} ETH</td>
                        <td>{equip.isAvailable ? 'Available' : 'Unavailable'}</td>
                        <td>
                          <button
                            className="btn btn-outline-primary btn-sm me-1"
                            onClick={() => {
                              setEditEquipId(equip.id);
                              setEquipName(equip.name);
                              setEquipQuantity(equip.quantity);
                              setEquipDailyPrice(equip.dailyPrice);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => handleRemoveEquipment(equip.id)}
                          >
                            Remove
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ))}

      {menu === 'requests' && isAdmin &&
        renderCard('Manage Requests', (
          <div className="table-responsive">
            <table className="table table-sm table-bordered">
              <thead className="table-light">
                <tr>
                  <th>ID</th>
                  <th>Equipment</th>
                  <th>Borrower</th>
                  <th>Request Date</th>
                  <th>Due Date</th>
                  <th>Total Price</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.id}>
                    <td>{req.id}</td>
                    <td>{req.equipmentName}</td>
                    <td>{req.borrower.substring(0, 6)}...{req.borrower.substring(38)}</td>
                    <td>{req.requestDate}</td>
                    <td>{req.dueDate}</td>
                    <td>{req.totalPrice} ETH</td>
                    <td>{renderStatusBadge(req.status)}</td>
                    <td>
                      {req.status === 0 && (
                        <>
                          <button
                            className="btn btn-success btn-sm me-1"
                            onClick={() => handleProcessRequest(req.id, true)}
                          >
                            Approve
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleProcessRequest(req.id, false)}
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {req.status === 3 && (
                        <button
                          className="btn btn-info btn-sm"
                          onClick={() => handleConfirmReturn(req.id)}
                        >
                          Confirm Return
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

      {menu === 'dashboard' &&
        renderCard('Available Equipment', (
          <div className="row">
            {equipmentList.filter(e => e.isAvailable).map((equip) => (
              <div key={equip.id} className="col-md-4 mb-3">
                <div className="card h-100">
                  <div className="card-body">
                    <h5 className="card-title">{equip.name}</h5>
                    <p className="card-text">
                      <strong>Available:</strong> {equip.quantity}<br />
                      <strong>Daily Price:</strong> {equip.dailyPrice} ETH
                    </p>
                  </div>
                  <div className="card-footer bg-transparent">
                    <button 
                      className="btn btn-primary w-100"
                      onClick={() => {
                        setSelectedEquipment(equip.id);
                        setMenu('request-equipment');
                      }}
                    >
                      Request This Equipment
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}

      {menu === 'request-equipment' &&
        renderCard('Request Equipment', (
          <div className="row">
            <div className="col-md-6 mx-auto">
              <div className="card">
                <div className="card-body">
                  <h5 className="card-title">
                    Request: {equipmentList.find(e => e.id === selectedEquipment)?.name}
                  </h5>
                  <div className="mb-3">
                    <label className="form-label">Duration (days)</label>
                    <input
                      type="number"
                      min="1"
                      className="form-control"
                      value={durationDays}
                      onChange={(e) => setDurationDays(e.target.value)}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Total Cost</label>
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control"
                        value={
                          (parseFloat(equipmentList.find(e => e.id === selectedEquipment)?.dailyPrice) * durationDays || 0).toFixed(4)
                        }
                        readOnly
                      />
                      <span className="input-group-text">ETH</span>
                    </div>
                  </div>
                  <div className="d-grid gap-2">
                    <button
                      className="btn btn-success"
                      onClick={handleRequestEquipment}
                    >
                      Submit Request
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setMenu('dashboard')}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

      {menu === 'my-requests' &&
        renderCard('My Requests', (
          <div className="table-responsive">
            <table className="table table-sm table-bordered">
              <thead className="table-light">
                <tr>
                  <th>ID</th>
                  <th>Equipment</th>
                  <th>Request Date</th>
                  <th>Due Date</th>
                  <th>Total Price</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {userRequests.map((req) => (
                  <tr key={req.id}>
                    <td>{req.id}</td>
                    <td>{req.equipmentName}</td>
                    <td>{req.requestDate}</td>
                    <td>{req.dueDate}</td>
                    <td>{req.totalPrice} ETH</td>
                    <td>{renderStatusBadge(req.status)}</td>
                    <td>
                      {req.status === 1 && (
                        <button
                          className="btn btn-info btn-sm"
                          onClick={() => handleReturnEquipment(req.id)}
                        >
                          Return Equipment
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
    </div>
  );
}

export default App;