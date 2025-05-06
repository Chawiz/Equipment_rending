// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EquipmentLending {
    address public owner;
    
    enum RequestStatus { 
        Pending,        // 0
        Approved,       // 1
        Rejected,       // 2
        ReturnRequested, // 3
        Returned,       // 4
        Completed       // 5
    }
    
    struct Equipment {
        uint256 id;
        string name;
        uint256 quantity;
        uint256 dailyPrice;
        bool isAvailable;
    }
    
    struct LendingRequest {
        uint256 id;
        uint256 equipmentId;
        address borrower;
        string equipmentName;
        uint256 requestDate;
        uint256 dueDate;
        uint256 totalPrice;
        uint256 dailyPrice;
        RequestStatus status;
        string adminComment;
        uint256 quantity;
    }
    
    uint256 private equipmentCounter = 1;
    uint256 private requestCounter = 1;
    
    mapping(uint256 => Equipment) public equipment;
    mapping(uint256 => LendingRequest) public requests;
    mapping(address => uint256[]) public borrowerRequests;
    mapping(uint256 => uint256) public rentedQuantity;
    
    event EquipmentAdded(uint256 indexed id, string name, uint256 quantity, uint256 dailyPrice);
    event EquipmentUpdated(uint256 indexed id, string name, uint256 quantity, uint256 dailyPrice);
    event EquipmentRemoved(uint256 indexed id);
    event EquipmentAvailabilityChanged(uint256 indexed id, bool isAvailable);
    event RequestSubmitted(
        uint256 indexed requestId, 
        uint256 indexed equipmentId, 
        address borrower, 
        uint256 quantity,
        uint256 totalPrice
    );
    event RequestProcessed(uint256 indexed requestId, bool approved, string comment);
    event ReturnRequested(uint256 indexed requestId);
    event ReturnConfirmed(uint256 indexed requestId);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }
    
    modifier validEquipment(uint256 _id) {
        require(_id > 0 && _id < equipmentCounter, "Invalid equipment ID");
        _;
    }
    
    modifier validRequest(uint256 _id) {
        require(_id > 0 && _id < requestCounter, "Invalid request ID");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    function addEquipment(
        string memory _name,
        uint256 _quantity,
        uint256 _dailyPrice
    ) external onlyOwner {
        require(bytes(_name).length > 0, "Name cannot be empty");
        require(_quantity > 0, "Quantity must be greater than 0");
        require(_dailyPrice > 0, "Daily price must be greater than 0");
        
        uint256 id = equipmentCounter;
        equipment[id] = Equipment(id, _name, _quantity, _dailyPrice, true);
        equipmentCounter++;
        
        emit EquipmentAdded(id, _name, _quantity, _dailyPrice);
    }
    
    function updateEquipment(
        uint256 _id,
        string memory _name,
        uint256 _quantity,
        uint256 _dailyPrice
    ) external onlyOwner validEquipment(_id) {
        require(bytes(_name).length > 0, "Name cannot be empty");
        require(_quantity >= rentedQuantity[_id], "Quantity cannot be less than rented items");
        require(_dailyPrice > 0, "Daily price must be greater than 0");
        
        equipment[_id].name = _name;
        equipment[_id].quantity = _quantity;
        equipment[_id].dailyPrice = _dailyPrice;
        
        emit EquipmentUpdated(_id, _name, _quantity, _dailyPrice);
    }
    
    function setEquipmentAvailability(uint256 _id, bool _isAvailable) 
        external 
        onlyOwner 
        validEquipment(_id) 
    {
        equipment[_id].isAvailable = _isAvailable;
        emit EquipmentAvailabilityChanged(_id, _isAvailable);
    }
    
    function removeEquipment(uint256 _id) external onlyOwner validEquipment(_id) {
        require(rentedQuantity[_id] == 0, "Cannot remove equipment with active rentals");
        
        delete equipment[_id];
        emit EquipmentRemoved(_id);
    }
    
    function requestEquipment(
        uint256 _equipmentId,
        uint256 _durationInDays,
        uint256 _quantity
    ) external payable validEquipment(_equipmentId) {
        require(_durationInDays > 0, "Duration must be at least 1 day");
        require(_quantity > 0, "Quantity must be at least 1");
        
        Equipment storage item = equipment[_equipmentId];
        require(item.isAvailable, "Equipment not available");
        require(_quantity <= item.quantity - rentedQuantity[_equipmentId], 
            "Not enough available equipment");
        
        uint256 totalPrice = item.dailyPrice * _durationInDays * _quantity;
        require(msg.value >= totalPrice, "Insufficient payment");
        
        // Return excess payment
        if (msg.value > totalPrice) {
            payable(msg.sender).transfer(msg.value - totalPrice);
        }
        
        uint256 dueDate = block.timestamp + (_durationInDays * 1 days);
        
        uint256 requestId = requestCounter;
        requests[requestId] = LendingRequest({
            id: requestId,
            equipmentId: _equipmentId,
            borrower: msg.sender,
            equipmentName: item.name,
            requestDate: block.timestamp,
            dueDate: dueDate,
            totalPrice: totalPrice,
            dailyPrice: item.dailyPrice,
            status: RequestStatus.Pending,
            adminComment: "",
            quantity: _quantity
        });
        
        borrowerRequests[msg.sender].push(requestId);
        rentedQuantity[_equipmentId] += _quantity;
        requestCounter++;
        
        emit RequestSubmitted(requestId, _equipmentId, msg.sender, _quantity, totalPrice);
    }
    
    function processRequest(
        uint256 _requestId,
        bool _approve,
        string memory _comment
    ) external onlyOwner validRequest(_requestId) {
        LendingRequest storage request = requests[_requestId];
        require(request.status == RequestStatus.Pending, "Request already processed");
        
        if (_approve) {
            request.status = RequestStatus.Approved;
        } else {
            request.status = RequestStatus.Rejected;
            // Refund payment if rejected
            payable(request.borrower).transfer(request.totalPrice);
            rentedQuantity[request.equipmentId] -= request.quantity;
        }
        
        request.adminComment = _comment;
        emit RequestProcessed(_requestId, _approve, _comment);
    }
    
    function requestReturn(uint256 _requestId) external validRequest(_requestId) {
        LendingRequest storage request = requests[_requestId];
        require(msg.sender == request.borrower, "Not the borrower");
        require(request.status == RequestStatus.Approved, "Request not approved");
        require(block.timestamp <= request.dueDate, "Already past due date");
        
        request.status = RequestStatus.ReturnRequested;
        emit ReturnRequested(_requestId);
    }
    
    function confirmReturn(uint256 _requestId) external onlyOwner validRequest(_requestId) {
        LendingRequest storage request = requests[_requestId];
        require(
            request.status == RequestStatus.ReturnRequested || 
            (request.status == RequestStatus.Approved && block.timestamp > request.dueDate),
            "Equipment not marked for return"
        );
        
        // Calculate actual usage
        uint256 endTime = request.status == RequestStatus.ReturnRequested ? 
            block.timestamp : request.dueDate;
        uint256 daysUsed = (endTime - request.requestDate) / 1 days;
        if ((endTime - request.requestDate) % 1 days > 0) {
            daysUsed += 1; // Count partial day as full day
        }
        
        uint256 amountOwed = request.dailyPrice * daysUsed * request.quantity;
        uint256 refundAmount = request.totalPrice - amountOwed;
        
        // Update status
        request.status = RequestStatus.Returned;
        rentedQuantity[request.equipmentId] -= request.quantity;
        
        // Process refund if applicable
        if (refundAmount > 0) {
            payable(request.borrower).transfer(refundAmount);
        }
        
        emit ReturnConfirmed(_requestId);
    }
    
    function completeRequest(uint256 _requestId) external onlyOwner validRequest(_requestId) {
        LendingRequest storage request = requests[_requestId];
        require(request.status == RequestStatus.Returned, "Equipment not returned");
        request.status = RequestStatus.Completed;
    }
    
    // View functions
    function getEquipmentCount() external view returns (uint256) {
        return equipmentCounter - 1;
    }
    
    function getRequestCount() external view returns (uint256) {
        return requestCounter - 1;
    }
    
    function getEquipmentDetails(uint256 _id) external view validEquipment(_id) returns (
        uint256, string memory, uint256, uint256, bool
    ) {
        Equipment memory item = equipment[_id];
        return (item.id, item.name, item.quantity, item.dailyPrice, item.isAvailable);
    }
    
    function getRequestDetails(uint256 _id) external view validRequest(_id) returns (
        uint256,         // 0 - id
        uint256,         // 1 - equipmentId
        address,         // 2 - borrower
        string memory,   // 3 - equipmentName
        uint256,         // 4 - requestDate
        uint256,         // 5 - dueDate
        uint256,         // 6 - totalPrice
        uint256,         // 7 - dailyPrice
        RequestStatus,   // 8 - status
        string memory,   // 9 - adminComment
        uint256          // 10 - quantity
    ) {
        LendingRequest memory request = requests[_id];
        return (
            request.id,
            request.equipmentId,
            request.borrower,
            request.equipmentName,
            request.requestDate,
            request.dueDate,
            request.totalPrice,
            request.dailyPrice,
            request.status,
            request.adminComment,
            request.quantity
        );
    }
    
    function getBorrowerRequests(address _borrower) external view returns (uint256[] memory) {
        return borrowerRequests[_borrower];
    }
    
    function getAvailableQuantity(uint256 _equipmentId) external view validEquipment(_equipmentId) returns (uint256) {
        return equipment[_equipmentId].quantity - rentedQuantity[_equipmentId];
    }
    
    function withdrawFunds() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        payable(owner).transfer(balance);
    }
    
    // Fallback function to receive ETH
    receive() external payable {}
}