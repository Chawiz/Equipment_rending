import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import VotingSystemABI from './VotingSystemABI.json';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import logo from './logo.png';

const CONTRACT_ADDRESS = '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9';

function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [positions, setPositions] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [voters, setVoters] = useState([]);
  const [menu, setMenu] = useState('voting');
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Position management
  const [positionName, setPositionName] = useState('');
  const [editPositionId, setEditPositionId] = useState(null);
  const [newPositionName, setNewPositionName] = useState('');
  
  // Candidate management
  const [candidateName, setCandidateName] = useState('');
  const [selectedPositionId, setSelectedPositionId] = useState('');
  const [editCandidateId, setEditCandidateId] = useState(null);
  const [newCandidateName, setNewCandidateName] = useState('');
  
  // Voter management
  const [voterName, setVoterName] = useState('');
  const [voterAddress, setVoterAddress] = useState('');
  const [editVoterAddress, setEditVoterAddress] = useState(null);
  const [newVoterName, setNewVoterName] = useState('');
  
  // Voting system
  const [selectedPosition, setSelectedPosition] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState('');
  
  // Admin system
  const [isAdmin, setIsAdmin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    document.title = "Smart Voting DApp";
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
      const contract = new ethers.Contract(CONTRACT_ADDRESS, VotingSystemABI, signer);
      const address = await signer.getAddress();

      setProvider(browserProvider);
      setSigner(signer);
      setContract(contract);
      setAccount(address);
      loadData(contract);
    };
    init();
  }, []);

  const loadData = async (contractInstance = contract) => {
    if (!contractInstance) return;
    try {
      const rawPositions = await contractInstance.getAllPositions();
      const positions = rawPositions.map(pos => ({
        id: pos.id.toString(),
        name: pos.name
      }));
      setPositions(positions);

      const [names, posNames, voteCounts] = await contractInstance.getAllCandidatesWithPositionNames();
      const candList = names.map((name, i) => ({
        id: (i + 1).toString(),
        name,
        position: posNames[i],
        votes: voteCounts[i].toString()
      }));
      setCandidates(candList);

      const voters = await contractInstance.getAllVoters();
      setVoters(voters);
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
    if (username === 'Regis' && password === '123') {
      setIsAdmin(true);
      localStorage.setItem('isAdmin', 'true');
      setMenu('positions');
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
    setMenu('voting');
    showMessage('success', 'Logged out successfully');
  };

  const handleCreatePosition = async () => {
    try {
      await contract.createPosition(positionName);
      setPositionName('');
      showMessage('success', 'Position created successfully.');
      loadData();
    } catch (err) {
      showMessage('danger', 'Error creating position.');
    }
  };

  const handleUpdatePosition = async (id) => {
    try {
      await contract.updatePosition(id, newPositionName);
      setEditPositionId(null);
      setNewPositionName('');
      showMessage('success', 'Position updated.');
      loadData();
    } catch {
      showMessage('danger', 'Failed to update position.');
    }
  };

  const handleDeletePosition = async (id) => {
    try {
      await contract.deletePosition(id);
      showMessage('success', 'Position deleted.');
      loadData();
    } catch {
      showMessage('danger', 'Failed to delete position.');
    }
  };

  const handleAddCandidate = async () => {
    try {
      await contract.addCandidate(candidateName, selectedPositionId);
      setCandidateName('');
      setSelectedPositionId('');
      showMessage('success', 'Candidate added.');
      loadData();
    } catch {
      showMessage('danger', 'Failed to add candidate.');
    }
  };

  const handleUpdateCandidate = async (id) => {
    try {
      await contract.updateCandidate(id, newCandidateName);
      setEditCandidateId(null);
      setNewCandidateName('');
      showMessage('success', 'Candidate updated.');
      loadData();
    } catch {
      showMessage('danger', 'Failed to update candidate.');
    }
  };

  const handleDeleteCandidate = async (id) => {
    try {
      await contract.deleteCandidate(id);
      showMessage('success', 'Candidate deleted.');
      loadData();
    } catch {
      showMessage('danger', 'Failed to delete candidate.');
    }
  };

  const handleRegisterVoter = async () => {
    try {
      await contract.registerVoter(voterName, voterAddress);
      setVoterName('');
      setVoterAddress('');
      showMessage('success', 'Voter registered.');
      loadData();
    } catch {
      showMessage('danger', 'Failed to register voter.');
    }
  };

  const handleUpdateVoter = async (address) => {
    try {
      await contract.updateVoter(address, newVoterName);
      setEditVoterAddress(null);
      setNewVoterName('');
      showMessage('success', 'Voter updated.');
      loadData();
    } catch {
      showMessage('danger', 'Failed to update voter.');
    }
  };

  const handleDeleteVoter = async (address) => {
    try {
      await contract.deleteVoter(address);
      showMessage('success', 'Voter deleted.');
      loadData();
    } catch {
      showMessage('danger', 'Failed to delete voter.');
    }
  };

  const handleVote = async () => {
    try {
      await contract.voteByName(selectedCandidate);
      setSelectedPosition('');
      setSelectedCandidate('');
      showMessage('success', 'Vote cast successfully.');
      loadData();
    } catch {
      showMessage('danger', 'Failed to cast vote.');
    }
  };

  const renderCard = (title, content) => (
    <div className="card mb-3">
      <div className="card-header text-white bg-primary">{title}</div>
      <div className="card-body">{content}</div>
    </div>
  );

  const renderResults = () => {
    const grouped = candidates.reduce((acc, candidate) => {
      const key = candidate.position;
      if (!acc[key]) acc[key] = [];
      acc[key].push(candidate);
      return acc;
    }, {});

    return (
      <div className="card">
        <div className="card-header text-white bg-info">Live Election Results</div>
        <div className="card-body">
          {Object.entries(grouped).map(([position, candidates]) => (
            <div key={position} className="mb-4">
              <h5 className="text-primary">{position}</h5>
              <div className="row">
                {candidates.map((candidate, idx) => (
                  <div key={idx} className="col-md-6 mb-3">
                    <div className="card">
                      <div className="card-body">
                        <div className="d-flex justify-content-between">
                          <span>{candidate.name}</span>
                          <span className="badge bg-primary">
                            Votes: {candidate.votes}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="container mt-4">
      <div className="text-center mb-4">
        <img src={logo} alt="Voting Logo" style={{ width: '100px', marginBottom: '1rem' }} />
        <h3>Welcome to Smart Voting DApp</h3>
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
              <button className={`nav-link ${menu === 'positions' ? 'active' : ''}`} 
                onClick={() => setMenu('positions')}>
                <i className="bi bi-briefcase me-1"></i>Positions
              </button>
            </li>
            <li className="nav-item">
              <button className={`nav-link ${menu === 'candidates' ? 'active' : ''}`} 
                onClick={() => setMenu('candidates')}>
                <i className="bi bi-person-badge me-1"></i>Candidates
              </button>
            </li>
            <li className="nav-item">
              <button className={`nav-link ${menu === 'voters' ? 'active' : ''}`} 
                onClick={() => setMenu('voters')}>
                <i className="bi bi-people me-1"></i>Voters
              </button>
            </li>
          </>
        )}
        <li className="nav-item">
          <button className={`nav-link ${menu === 'voting' ? 'active' : ''}`} 
            onClick={() => setMenu('voting')}>
            <i className="bi bi-check2-square me-1"></i>Voting
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${menu === 'results' ? 'active' : ''}`} 
            onClick={() => setMenu('results')}>
            <i className="bi bi-graph-up me-1"></i>Results
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

      {menu === 'positions' && isAdmin &&
        renderCard('Manage Positions', (
          <>
            <div className="input-group input-group-sm mb-3">
              <input 
                value={positionName} 
                onChange={(e) => setPositionName(e.target.value)} 
                className="form-control" 
                placeholder="New Position" 
              />
              <button className="btn btn-success" onClick={handleCreatePosition}>
                Add Position
              </button>
            </div>
            <table className="table table-sm table-bordered">
              <thead className="table-light">
                <tr>
                  <th>Position</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((pos) => (
                  <tr key={pos.id}>
                    {editPositionId === pos.id ? (
                      <>
                        <td>
                          <input
                            className="form-control form-control-sm"
                            value={newPositionName}
                            onChange={(e) => setNewPositionName(e.target.value)}
                          />
                        </td>
                        <td>
                          <button
                            className="btn btn-primary btn-sm me-1"
                            onClick={() => handleUpdatePosition(pos.id)}
                          >
                            Save
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setEditPositionId(null)}
                          >
                            Cancel
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{pos.name}</td>
                        <td>
                          <button
                            className="btn btn-outline-primary btn-sm me-1"
                            onClick={() => { 
                              setEditPositionId(pos.id); 
                              setNewPositionName(pos.name); 
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => handleDeletePosition(pos.id)}
                          >
                            Delete
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

      {menu === 'candidates' && isAdmin &&
        renderCard('Manage Candidates', (
          <>
            <div className="input-group input-group-sm mb-3">
              <input 
                value={candidateName} 
                onChange={(e) => setCandidateName(e.target.value)} 
                className="form-control" 
                placeholder="Candidate Name" 
              />
              <select
                value={selectedPositionId}
                onChange={(e) => setSelectedPositionId(e.target.value)}
                className="form-select"
              >
                <option value="">Select Position</option>
                {positions.map((pos) => (
                  <option key={pos.id} value={pos.id}>{pos.name}</option>
                ))}
              </select>
              <button className="btn btn-success" onClick={handleAddCandidate}>
                Add Candidate
              </button>
            </div>
            <table className="table table-sm table-bordered">
              <thead className="table-light">
                <tr>
                  <th>Candidate</th>
                  <th>Position</th>
                  <th>Votes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((cand) => (
                  <tr key={cand.id}>
                    {editCandidateId === cand.id ? (
                      <>
                        <td>
                          <input
                            className="form-control form-control-sm"
                            value={newCandidateName}
                            onChange={(e) => setNewCandidateName(e.target.value)}
                          />
                        </td>
                        <td colSpan="2">{cand.position}</td>
                        <td>
                          <button
                            className="btn btn-primary btn-sm me-1"
                            onClick={() => handleUpdateCandidate(cand.id)}
                          >
                            Save
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setEditCandidateId(null)}
                          >
                            Cancel
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{cand.name}</td>
                        <td>{cand.position}</td>
                        <td>{cand.votes}</td>
                        <td>
                          <button
                            className="btn btn-outline-primary btn-sm me-1"
                            onClick={() => { 
                              setEditCandidateId(cand.id); 
                              setNewCandidateName(cand.name); 
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => handleDeleteCandidate(cand.id)}
                          >
                            Delete
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

      {menu === 'voters' && isAdmin &&
        renderCard('Manage Voters', (
          <>
            <div className="input-group input-group-sm mb-3">
              <input 
                value={voterName} 
                onChange={(e) => setVoterName(e.target.value)} 
                className="form-control" 
                placeholder="Name" 
              />
              <input 
                value={voterAddress} 
                onChange={(e) => setVoterAddress(e.target.value)} 
                className="form-control" 
                placeholder="Address" 
              />
              <button className="btn btn-success" onClick={handleRegisterVoter}>
                Register Voter
              </button>
            </div>
            <table className="table table-sm table-bordered">
              <thead className="table-light">
                <tr>
                  <th>Name</th>
                  <th>Address</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {voters.map((v) => (
                  <tr key={v.voterAddress}>
                    {editVoterAddress === v.voterAddress ? (
                      <>
                        <td>
                          <input
                            className="form-control form-control-sm"
                            value={newVoterName}
                            onChange={(e) => setNewVoterName(e.target.value)}
                          />
                        </td>
                        <td>{v.voterAddress}</td>
                        <td>
                          <button
                            className="btn btn-primary btn-sm me-1"
                            onClick={() => handleUpdateVoter(v.voterAddress)}
                          >
                            Save
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setEditVoterAddress(null)}
                          >
                            Cancel
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{v.name}</td>
                        <td>{v.voterAddress}</td>
                        <td>
                          <button
                            className="btn btn-outline-primary btn-sm me-1"
                            onClick={() => {
                              setEditVoterAddress(v.voterAddress);
                              setNewVoterName(v.name);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => handleDeleteVoter(v.voterAddress)}
                          >
                            Delete
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

      {menu === 'voting' &&
        renderCard('Vote Now', (
          <div className="voting-interface">
            <div className="mb-3">
              <select
                className="form-select"
                value={selectedPosition}
                onChange={(e) => {
                  setSelectedPosition(e.target.value);
                  setSelectedCandidate('');
                }}
              >
                <option value="">Select Position</option>
                {positions.map((pos) => (
                  <option key={pos.id} value={pos.id}>
                    {pos.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedPosition && (
              <div className="mb-3">
                <select
                  className="form-select"
                  value={selectedCandidate}
                  onChange={(e) => setSelectedCandidate(e.target.value)}
                >
                  <option value="">Select Candidate</option>
                  {candidates
                    .filter(candidate => {
                      const selectedPos = positions.find(
                        pos => pos.id === selectedPosition
                      );
                      return candidate.position === selectedPos?.name;
                    })
                    .map(candidate => (
                      <option key={candidate.id} value={candidate.name}>
                        {candidate.name}
                      </option>
                    ))}
                </select>
              </div>
            )}

            <button
              className="btn btn-success w-100"
              onClick={handleVote}
              disabled={!selectedPosition || !selectedCandidate}
            >
              <i className="bi bi-check2-square me-1"></i>Submit Vote
            </button>
          </div>
        ))}

      {menu === 'results' && renderResults()}
    </div>
  );
}

export default App;