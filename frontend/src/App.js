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
  const [requestQuantity, setRequestQuantity] = useState(1);
  const [adminComment, setAdminComment] = useState('');
  const [processingRequest, setProcessingRequest] = useState(null);
  
  // Admin system
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    document.title = "Equipment Lending DApp";
    const init = async () => {
      if (!window.ethereum) {
        showMessage('danger', 'Please install MetaMask to use this application');
        return;
      }
      
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (!accounts.length) {
          showMessage('danger', 'No accounts found');
          return;
        }

        const browserProvider = new ethers.BrowserProvider(window.ethereum);
        const signer = await browserProvider.getSigner();
        const contract = new ethers.Contract(CONTRACT_ADDRESS, EquipmentLendingABI, signer);
        
        setProvider(browserProvider);
        setSigner(signer);
        setContract(contract);
        setAccount(accounts[0]);

        const owner = await contract.owner();
        if (accounts[0].toLowerCase() === owner.toLowerCase()) {
          setIsAdmin(true);
        }

        loadData(contract, accounts[0]);
      } catch (err) {
        showMessage('danger', `Connection error: ${err.message}`);
      }
    };
    init();

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners();
      }
    };
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

      // Load requests
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
          status: Number(req[8]),
          adminComment: req[9],
          quantity: req[10] ? req[10].toString() : "1"
        };
        
        allRequests.push(request);
        if (req[2].toLowerCase() === userAddress.toLowerCase()) {
          userReqs.push(request);
        }
      }
      
      setRequests(allRequests);
      setUserRequests(userReqs);
    } catch (err) {
      showMessage('danger', 'Failed to load data: ' + err.message);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleLogout = () => {
    setIsAdmin(false);
    setMenu('dashboard');
    showMessage('success', 'Logged out successfully');
  };

  const handleAddEquipment = async () => {
    if (!contract) {
      showMessage('danger', 'Contract not connected');
      return;
    }

    try {
      await contract.addEquipment(
        equipName,
        equipQuantity,
        ethers.parseEther(equipDailyPrice.toString())
      );
      setEquipName('');
      setEquipQuantity(1);
      setEquipDailyPrice(0);
      showMessage('success', 'Equipment added successfully');
      loadData();
    } catch (err) {
      showMessage('danger', 'Error adding equipment: ' + err.message);
    }
  };

  const handleUpdateEquipment = async (id) => {
    if (!contract) {
      showMessage('danger', 'Contract not connected');
      return;
    }

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
      showMessage('success', 'Equipment updated');
      loadData();
    } catch (err) {
      showMessage('danger', 'Failed to update equipment: ' + err.message);
    }
  };

  const handleRemoveEquipment = async (id) => {
    if (!contract) {
      showMessage('danger', 'Contract not connected');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this equipment?')) return;
    try {
      await contract.removeEquipment(id);
      showMessage('success', 'Equipment deleted');
      loadData();
    } catch (err) {
      showMessage('danger', 'Failed to delete equipment: ' + err.message);
    }
  };

  const handleRequestEquipment = async () => {
    if (!contract) {
      showMessage('danger', 'Contract not connected');
      return;
    }

    try {
      const selectedEquip = equipmentList.find(e => e.id === selectedEquipment);
      if (!selectedEquip) {
        showMessage('danger', 'Selected equipment not found');
        return;
      }

      const totalPrice = ethers.parseEther(
        (parseFloat(selectedEquip.dailyPrice) * durationDays * requestQuantity).toString()
      );
      
      const tx = await contract.requestEquipment(
        selectedEquipment,
        durationDays,
        requestQuantity,
        { value: totalPrice }
      );
      await tx.wait();
      
      setSelectedEquipment('');
      setDurationDays(1);
      setRequestQuantity(1);
      showMessage('success', 'Request submitted successfully');
      loadData();
    } catch (err) {
      showMessage('danger', 'Failed to submit request: ' + err.message);
    }
  };

  const handleProcessRequest = async (requestId, approve) => {
    if (!contract) {
      showMessage('danger', 'Contract not connected');
      return;
    }

    try {
      const tx = await contract.processRequest(
        requestId,
        approve,
        adminComment || (approve ? 'Approved' : 'Rejected')
      );
      await tx.wait();
      
      setAdminComment('');
      setProcessingRequest(null);
      showMessage('success', `Request ${approve ? 'approved' : 'rejected'}`);
      loadData();
    } catch (err) {
      showMessage('danger', `Failed to process request: ${err.message}`);
    }
  };

  const handleReturnEquipment = async (requestId) => {
    if (!contract) {
      showMessage('danger', 'Contract not connected');
      return;
    }

    try {
      const tx = await contract.requestReturn(requestId);
      await tx.wait();
      showMessage('success', 'Return request submitted');
      loadData();
    } catch (err) {
      showMessage('danger', 'Failed to submit return: ' + err.message);
    }
  };

  const handleConfirmReturn = async (requestId) => {
    if (!contract) {
      showMessage('danger', 'Contract not connected');
      return;
    }

    try {
      const tx = await contract.confirmReturn(requestId);
      await tx.wait();
      showMessage('success', 'Return confirmed successfully');
      loadData();
    } catch (err) {
      showMessage('danger', 'Failed to confirm return: ' + err.message);
    }
  };

  const renderStatusBadge = (status) => {
    const statusMap = {
      0: { text: 'Pending', class: 'bg-warning' },
      1: { text: 'Approved', class: 'bg-success' },
      2: { text: 'Rejected', class: 'bg-danger' },
      3: { text: 'Return Requested', class: 'bg-info' },
      4: { text: 'Returned', class: 'bg-primary' },
      5: { text: 'Completed', class: 'bg-secondary' }
    };
    return (
      <span className={`badge ${statusMap[status]?.class || 'bg-light text-dark'}`}>
        {statusMap[status]?.text || 'Unknown'}
      </span>
    );
  };

  const renderUserNav = () => (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary mb-4">
      <div className="container-fluid">
        <span className="navbar-brand">
          <img src={logo} alt="Logo" width="100" className="me-2" />
          Equipment Lending
        </span>
        <div className="d-flex">
          <button 
            className={`btn btn-outline-light me-2 ${menu === 'dashboard' ? 'active' : ''}`}
            onClick={() => setMenu('dashboard')}
          >
            <i className="bi bi-house-door me-1"></i> Dashboard
          </button>
          <button 
            className={`btn btn-outline-light ${menu === 'my-requests' ? 'active' : ''}`}
            onClick={() => setMenu('my-requests')}
          >
            <i className="bi bi-list-check me-1"></i> My Requests
          </button>
        </div>
      </div>
    </nav>
  );

  const renderAdminNav = () => (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark mb-4">
      <div className="container-fluid">
        <span className="navbar-brand">
          <img src={logo} alt="Logo" width="100" className="me-2" />
          Admin Panel
        </span>
        <div className="d-flex">
          <button 
            className={`btn btn-outline-light me-2 ${menu === 'equipment' ? 'active' : ''}`}
            onClick={() => setMenu('equipment')}
          >
            <i className="bi bi-tools me-1"></i> Equipment
          </button>
          <button 
            className={`btn btn-outline-light me-2 ${menu === 'requests' ? 'active' : ''}`}
            onClick={() => setMenu('requests')}
          >
            <i className="bi bi-list-check me-1"></i> Requests
          </button>
          <button 
            className="btn btn-outline-danger"
            onClick={handleLogout}
          >
            <i className="bi bi-box-arrow-right me-1"></i> Logout
          </button>
        </div>
      </div>
    </nav>
  );

  const renderProcessModal = () => (
    <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              {processingRequest?.status === 0 ? 'Process Request' : 'Confirm Return'}
            </h5>
            <button type="button" className="btn-close" onClick={() => setProcessingRequest(null)}></button>
          </div>
          <div className="modal-body">
            <div className="mb-3">
              <label className="form-label">Request Details</label>
              <div className="card bg-light p-3 mb-3">
                <p><strong>Equipment:</strong> {processingRequest?.equipmentName}</p>
                <p><strong>Quantity:</strong> {processingRequest?.quantity}</p>
                <p><strong>Borrower:</strong> {processingRequest?.borrower.substring(0, 6)}...{processingRequest?.borrower.substring(38)}</p>
                <p><strong>Request Date:</strong> {processingRequest?.requestDate}</p>
                <p><strong>Due Date:</strong> {processingRequest?.dueDate}</p>
                <p><strong>Total Price:</strong> {processingRequest?.totalPrice} ETH</p>
                <p><strong>Status:</strong> {renderStatusBadge(processingRequest?.status)}</p>
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label">Comments</label>
              <textarea
                className="form-control"
                value={adminComment}
                onChange={(e) => setAdminComment(e.target.value)}
                rows="3"
                placeholder="Enter comments here..."
              />
            </div>
          </div>
          <div className="modal-footer">
            {processingRequest?.status === 0 && (
              <>
                <button 
                  className="btn btn-success me-2"
                  onClick={() => handleProcessRequest(processingRequest.id, true)}
                >
                  <i className="bi bi-check-circle me-1"></i> Approve
                </button>
                <button 
                  className="btn btn-danger me-2"
                  onClick={() => handleProcessRequest(processingRequest.id, false)}
                >
                  <i className="bi bi-x-circle me-1"></i> Reject
                </button>
              </>
            )}
            {processingRequest?.status === 3 && (
              <button 
                className="btn btn-primary me-2"
                onClick={() => handleConfirmReturn(processingRequest.id)}
              >
                <i className="bi bi-check-circle me-1"></i> Confirm Return
              </button>
            )}
            <button 
              className="btn btn-secondary"
              onClick={() => setProcessingRequest(null)}
            >
              <i className="bi bi-x-circle me-1"></i> Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container">
      {/* Navigation */}
      {isAdmin ? renderAdminNav() : renderUserNav()}

      {/* Message Alert */}
      {message.text && (
        <div className={`alert alert-${message.type} alert-dismissible fade show`}>
          {message.text}
          <button type="button" className="btn-close" onClick={() => setMessage({ type: '', text: '' })}></button>
        </div>
      )}

      {/* Request Processing Modal */}
      {processingRequest && renderProcessModal()}

      {/* Dashboard */}
      {menu === 'dashboard' && (
        <div className="row">
          {equipmentList.filter(e => e.isAvailable).map((equip) => (
            <div key={equip.id} className="col-md-4 mb-4">
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
                    <i className="bi bi-cart-plus me-1"></i> Request
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Request Equipment */}
      {menu === 'request-equipment' && (
        <div className="card mx-auto" style={{ maxWidth: '600px' }}>
          <div className="card-header bg-primary text-white">
            <h5>Request Equipment</h5>
          </div>
          <div className="card-body">
            <h4 className="mb-4">
              {equipmentList.find(e => e.id === selectedEquipment)?.name}
            </h4>
            
            <div className="mb-3">
              <label className="form-label">Quantity</label>
              <input
                type="number"
                min="1"
                max={equipmentList.find(e => e.id === selectedEquipment)?.quantity}
                className="form-control"
                value={requestQuantity}
                onChange={(e) => setRequestQuantity(Math.min(e.target.value, equipmentList.find(e => e.id === selectedEquipment)?.quantity))}
              />
              <small className="text-muted">
                Available: {equipmentList.find(e => e.id === selectedEquipment)?.quantity}
              </small>
            </div>
            
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
            
            <div className="mb-4 p-3 bg-light rounded">
              <h5>Cost Summary</h5>
              <div className="d-flex justify-content-between">
                <span>Daily Rate:</span>
                <span>{equipmentList.find(e => e.id === selectedEquipment)?.dailyPrice} ETH</span>
              </div>
              <div className="d-flex justify-content-between">
                <span>Quantity:</span>
                <span>{requestQuantity}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span>Duration:</span>
                <span>{durationDays} days</span>
              </div>
              <hr />
              <div className="d-flex justify-content-between fw-bold">
                <span>Total Cost:</span>
                <span>
                  {(parseFloat(equipmentList.find(e => e.id === selectedEquipment)?.dailyPrice) * durationDays * requestQuantity || 0).toFixed(4)} ETH
                </span>
              </div>
            </div>
            
            <div className="d-grid gap-2 d-md-flex justify-content-md-end">
              <button
                className="btn btn-secondary me-md-2"
                onClick={() => setMenu('dashboard')}
              >
                <i className="bi bi-x-circle me-1"></i> Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleRequestEquipment}
              >
                <i className="bi bi-send me-1"></i> Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Equipment Management */}
      {menu === 'equipment' && isAdmin && (
        <div className="card">
          <div className="card-header bg-primary text-white">
            <h5>Manage Equipment</h5>
          </div>
          <div className="card-body">
            <div className="row mb-4 g-3">
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
                  {editEquipId ? (
                    <><i className="bi bi-save me-1"></i> Update</>
                  ) : (
                    <><i className="bi bi-plus-circle me-1"></i> Add</>
                  )}
                </button>
              </div>
            </div>
            
            <div className="table-responsive">
              <table className="table table-hover">
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
                              className="form-control"
                              value={equipName}
                              onChange={(e) => setEquipName(e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="1"
                              className="form-control"
                              value={equipQuantity}
                              onChange={(e) => setEquipQuantity(e.target.value)}
                            />
                          </td>
                          <td>
                            <div className="input-group">
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
                          <td>
                            <span className={`badge ${equip.isAvailable ? 'bg-success' : 'bg-danger'}`}>
                              {equip.isAvailable ? 'Available' : 'Unavailable'}
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn btn-primary btn-sm me-2"
                              onClick={() => handleUpdateEquipment(equip.id)}
                            >
                              <i className="bi bi-save me-1"></i> Save
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
                              <i className="bi bi-x-circle me-1"></i> Cancel
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>{equip.name}</td>
                          <td>{equip.quantity}</td>
                          <td>{equip.dailyPrice} ETH</td>
                          <td>
                            <span className={`badge ${equip.isAvailable ? 'bg-success' : 'bg-danger'}`}>
                              {equip.isAvailable ? 'Available' : 'Unavailable'}
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn btn-outline-primary btn-sm me-2"
                              onClick={() => {
                                setEditEquipId(equip.id);
                                setEquipName(equip.name);
                                setEquipQuantity(equip.quantity);
                                setEquipDailyPrice(equip.dailyPrice);
                              }}
                            >
                              <i className="bi bi-pencil me-1"></i> Edit
                            </button>
                            <button
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => handleRemoveEquipment(equip.id)}
                            >
                              <i className="bi bi-trash me-1"></i> Delete
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Request Management */}
      {menu === 'requests' && isAdmin && (
        <div className="card">
          <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Manage Requests</h5>
            <span className="badge bg-light text-dark">
              {requests.filter(r => r.status === 0).length} Pending
            </span>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Equipment</th>
                    <th>Borrower</th>
                    <th>Qty</th>
                    <th>Dates</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => (
                    <tr key={req.id}>
                      <td>{req.id}</td>
                      <td>{req.equipmentName}</td>
                      <td>
                        {req.borrower.substring(0, 6)}...{req.borrower.substring(38)}
                      </td>
                      <td>{req.quantity}</td>
                      <td>
                        <small>
                          <div>Req: {req.requestDate}</div>
                          <div>Due: {req.dueDate}</div>
                        </small>
                      </td>
                      <td>{req.totalPrice} ETH</td>
                      <td>{renderStatusBadge(req.status)}</td>
                      <td>
                        {req.status === 0 && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => {
                              setProcessingRequest(req);
                              setAdminComment('');
                            }}
                          >
                            <i className="bi bi-gear me-1"></i> Process
                          </button>
                        )}
                        {req.status === 3 && (
                          <button
                            className="btn btn-info btn-sm"
                            onClick={() => {
                              setProcessingRequest(req);
                              setAdminComment('');
                            }}
                          >
                            <i className="bi bi-check-circle me-1"></i> Confirm Return
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* My Requests */}
      {menu === 'my-requests' && (
        <div className="card">
          <div className="card-header bg-primary text-white">
            <h5>My Requests</h5>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Equipment</th>
                    <th>Qty</th>
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
                      <td>{req.quantity}</td>
                      <td>{req.requestDate}</td>
                      <td>{req.dueDate}</td>
                      <td>{req.totalPrice} ETH</td>
                      <td>{renderStatusBadge(req.status)}</td>
                      <td>
                        {req.status === 1 && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleReturnEquipment(req.id)}
                          >
                            <i className="bi bi-arrow-return-left me-1"></i> Return
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

