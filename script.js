// script.js

// Function to set the initial state of tabs upon page load
function setInitialTabsState() {
    document.getElementById('content1').style.display = 'block';
    document.getElementById('content2').style.display = 'none';
    document.getElementById('tab1').classList.add('active-tab');
    document.getElementById('tab2').classList.remove('active-tab');
}

// Call the function on page load
document.addEventListener('DOMContentLoaded', setInitialTabsState);

function changeContent(tab) {
    // Reset styles for all tabs
    document.getElementById('tab1').classList.remove('active-tab');
    document.getElementById('tab2').classList.remove('active-tab');

    if (tab === 'content1') {
        document.getElementById('content1').style.display = 'block';
        document.getElementById('content2').style.display = 'none';
        document.getElementById('tab1').classList.add('active-tab');
    } 
    else if (tab === 'content2') {
        document.getElementById('content1').style.display = 'none';
        document.getElementById('content2').style.display = 'block';
        document.getElementById('tab2').classList.add('active-tab');
    }
}

fetch('https://raw.githubusercontent.com/JayGupta797/course-network/main/graph.json').then(res => res.json()).then(data => {

  // Easily access nodes and links
  // const filteredNodes = data.nodes
  // const filteredLinks = data.links

  // Filter out nodes without incoming and outgoing links
  const filteredNodes = data.nodes.filter(node => {
    // Check if the node has at least one incoming or outgoing link
    return data.links.some(link => link.source === node.id || link.target === node.id);
  });

  // Filter out links that connect to nodes with no links
  const filteredLinks = data.links.filter(link => {
    return filteredNodes.some(node => node.id === link.source) && filteredNodes.some(node => node.id === link.target);
  });

  // Add neighbor and link attributes to nodes
  filteredNodes.forEach(node => {
    node.forward = [];
    node.neighbors = [];
    node.links = [];
    node.incomingCount = 0;
    node.outgoingCount = 0;
  });

  // Populate neighbors and links based on links
  filteredLinks.forEach(link => {
    const sourceNode = filteredNodes.find(node => node.id === link.source);
    const targetNode = filteredNodes.find(node => node.id === link.target);

    if (sourceNode && targetNode) {
      sourceNode.forward.push(targetNode);
      sourceNode.neighbors.push(targetNode);
      targetNode.neighbors.push(sourceNode);
      sourceNode.links.push(link);
      targetNode.links.push(link);

      // Increment the incoming count for the target node
      targetNode.incomingCount++;

      // Increment the outgoing count for the source node
      sourceNode.outgoingCount++;
    }
  });

  const highlightNodes = new Set();
  const highlightLinks = new Set();
  let hoverNode = null;

  // Graph container and dimensions
  const graphContainer = document.getElementById('graph');
  const initialWidth = window.innerWidth * 70 / 100;
  const initialHeight = graphContainer.clientHeight;

  const Graph = ForceGraph()(graphContainer)
    .width(initialWidth)
    .height(initialHeight)
    .graphData({
      nodes: filteredNodes,
      links: filteredLinks
    })
    .nodeLabel('id')
    .onNodeClick(node => {
        toggleNodeHighlight(node);
        zoomIntoNode(node);
    })
    .autoPauseRedraw(false) // keep redrawing after the engine has stopped
    .linkWidth(link => highlightLinks.has(link) ? 5 : 1)
    .linkDirectionalParticles(2)
    .linkDirectionalParticleWidth(link => highlightLinks.has(link) ? 4 : 0)
    .nodeCanvasObjectMode(node => highlightNodes.has(node) ? 'before' : undefined)
    .nodeCanvasObject((node, ctx) => {
        // Add a ring just for highlighted nodes
        ctx.beginPath();
        ctx.arc(node.x, node.y, 6, 0, 2 * Math.PI, false);

        // Check if the node is highlighted or clicked
        if (node === hoverNode) {
            ctx.fillStyle = 'black'; // Color for highlighted node
        } else {
            // Color based on incoming and outgoing nodes with respect to hoverNode
            if (hoverNode && hoverNode.forward.includes(node)) {
                // Outgoing nodes relative to hoverNode
                ctx.fillStyle = 'red'; // You can adjust the color
            } else if (hoverNode && node.forward.includes(hoverNode)) {
                // Incoming nodes relative to hoverNode
                ctx.fillStyle = 'blue'; // You can adjust the color
            } else {
                // Default color for non-highlighted nodes
                ctx.fillStyle = 'black'; // You can adjust the color
            }
        }
        ctx.fill();
    });

    // Function to toggle highlight nodes
    function toggleNodeHighlight(node) {
        highlightNodes.clear();
        highlightLinks.clear();
        if (node) {
            highlightNodes.add(node);
            node.neighbors.forEach(neighbor => highlightNodes.add(neighbor));
            node.links.forEach(link => highlightLinks.add(link));
            hoverNode = node;
        }
    }

    // Function to zoom into a node
    function zoomIntoNode(node) {
        Graph.centerAt(node.x, node.y, 1000);
        Graph.zoom(1.5, 1000) // Make this depend on the number of outgoing nodes?
    }

    // Function to handle global click events
    function handleGlobalClick(event) {
        // Check if the click is outside the table or graph
        if (!event.target.closest("#nodeTable")) {
            highlightNodes.clear();
            highlightLinks.clear();
        }
    }

    // Attach the global click event listener to the document
    document.addEventListener("click", handleGlobalClick);

    // Helpler Function to get Colors
    function generateUniqueColors(n) {
      const colors = [];

      for (let i = 0; i < n; i++) {
        const hue = (i * (360 / n)) % 360; // Distribute hues evenly
        const saturation = 50; // You can adjust this value
        const lightness = 50; // You can adjust this value

        const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        colors.push(color);
      }

      return colors;
    }

    // Function to update legend
    function updateLegend(nodes) {
      
      const legendBody = document.getElementById('LegendBody');

      // Clear previous table content
      legendBody.innerHTML = '';

      const uniqueGroups = [...new Set(nodes.map(node => node.group))];
      const colors = generateUniqueColors(uniqueGroups.length);
      const groupColors = {};

      // Run through unique groups
      uniqueGroups.forEach((group, index) => {

        // Store color
        groupColors[group] = colors[index];

        // Create cells
        const row = document.createElement("tr");
        const groupCell = document.createElement("td");
        const hexCell = document.createElement("td");
        const colorCell = document.createElement("td");

        // Add content
        groupCell.textContent = `${group}`;
        hexCell.textContent = `${colors[index]}`;
        colorCell.style.backgroundColor = colors[index] || 'black';

        // Append children
        row.appendChild(groupCell);
        row.appendChild(hexCell);
        row.appendChild(colorCell);
        legendBody.appendChild(row);
      });

      // Add node colors
      nodes.forEach(node => node.color = groupColors[node.group])
    }

    // Update legend initially
    updateLegend(filteredNodes);

    // Function to highlight a table row on hover
    function highlightNode(row) {
        // Add light shading to the entire row on hover
        row.style.backgroundColor = "#f2f2f2";

        // Change cursor to a pointer on hover
        row.style.cursor = "pointer";
    }

    // Function to remove highlighting when mouse leaves a cell
    function unhighlightNode(row) {
        // Add light shading to the entire row on hover
        row.style.backgroundColor = "";

        // Change cursor to a pointer on hover
        row.style.cursor = "";
    }

    // Function to populate the table from graph nodes
    function populateNodeTable() {

        const tableBody = document.getElementById("TableBody");
        const searchInput = document.getElementById("searchInput");

        // Clear previous table content
        tableBody.innerHTML = '';

        // Filter nodes based on the search input
        const searchTerm = searchInput.value.toLowerCase();
        const searchFilteredNodes = filteredNodes.filter(node => node.id.toLowerCase().includes(searchTerm));

        // Populate the table with filtered nodes
        searchFilteredNodes.forEach(node => {
            const row = document.createElement("tr");
            const nameCell = document.createElement("td");
            const incomingCell = document.createElement("td");
            const outgoingCell = document.createElement("td");
            const groupCell = document.createElement("td");

            nameCell.textContent = node.id;
            incomingCell.textContent = node.incomingCount;
            outgoingCell.textContent = node.outgoingCount;
            groupCell.textContent = node.group;

            // Add event listeners for highlighting on hover and click
            row.addEventListener("mouseover", () => highlightNode(row));
            row.addEventListener("mouseout", () => unhighlightNode(row));
            row.addEventListener("click", () => {
                toggleNodeHighlight(node);
                zoomIntoNode(node);
            });

            row.appendChild(nameCell);
            row.appendChild(incomingCell);
            row.appendChild(outgoingCell);
            row.appendChild(groupCell);
            tableBody.appendChild(row);
        });
    }   

    // Call the populateNodeTable function
    populateNodeTable();

    // Attach event listener to the search input for real-time updates
    document.getElementById("searchInput").addEventListener("input", populateNodeTable);
});

let currentSortColumn = null;
let currentSortDirection = 'ascending';

// Function to toggle the sort direction
function toggleSortDirection() {
    currentSortDirection = currentSortDirection === 'ascending' ? 'descending' : 'ascending';
}

// Function to update the sort icon based on the current sort direction
function updateSortIcon(column) {
    const iconElement = document.getElementById(`${column}-sort-icon`);

    // Remove existing classes
    iconElement.classList.remove('ascending', 'descending');

    // Add the appropriate class based on the current sort direction
    iconElement.classList.add(currentSortDirection);
}

// Function to sort the table by a specific column
function sortTableBy(column) {

    // Toggle the sort direction if clicking the same column
    if (currentSortColumn === column) {
        toggleSortDirection();
    } else {
        // Reset sort direction if clicking a different column
        currentSortDirection = 'ascending';
    }

    // Update the sort icon
    updateSortIcon(column);

    // Update the current sort column
    currentSortColumn = column;

    const tableBody = document.getElementById("TableBody");
    const rows = Array.from(tableBody.getElementsByTagName("tr"));

    // Exclude the first row from sorting
    // const rowsToSort = rows.slice(1)

    // Sort the remaining rows based on the selected column and direction
    rows.sort((a, b) => {
        const aValue = getColumnValue(a, column);
        const bValue = getColumnValue(b, column);

        // Apply different sorting logic based on the column
        if (column === 'name' || column === 'group') {
            // Alphabetical sorting for the "name" column
            return currentSortDirection === 'ascending'
                ? aValue.localeCompare(bValue)
                : bValue.localeCompare(aValue);
        } else {
            // Numeric sorting for "incoming" and "outgoing" columns
            const numericA = parseInt(aValue, 10);
            const numericB = parseInt(bValue, 10);
            return currentSortDirection === 'ascending'
                ? numericA - numericB
                : numericB - numericA;
        }
    });

    // Clear the existing rows
    tableBody.innerHTML = '';

    // Append the sorted rows to the table
    rows.forEach(row => tableBody.appendChild(row));
}

// Function to get the value of a specific column in a row
function getColumnValue(row, column) {
    const cells = row.getElementsByTagName("td");

    if (cells.length > 0) {
        // Customize the column index based on your table structure
        switch (column) {
            case 'name':
                return cells[0].textContent;
            case 'incoming':
                return cells[1].textContent;
            case 'outgoing':
                return cells[2].textContent;
            case 'group':
                return cells[3].textContent;
            default:
                return ''; // Handle other columns if needed
        }
    }
}



