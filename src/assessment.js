// Global variables for assessment
window.assessmentData = null;
window.assessmentResponses = {};
window.currentSection = 0;
window.courseData = null;
window.currentUser = "Current User";
window.currentDate = "Current Date";

// Main function called from FileMaker to load the assessment with course data
window.loadAssessment = (courseData, user, date) => {
  console.log('loadAssessment called with user:', user);
  console.log('Course data:', courseData);
  
  // Store data globally
  window.courseData = courseData;
  window.currentUser = user || "Current User";
  window.currentDate = date || "Current Date";
  
  console.log('window.currentUser set to:', window.currentUser);
  
  // Parse the course data if it's a string
  let parsedCourseData;
  try {
    parsedCourseData = typeof courseData === 'string' ? JSON.parse(courseData) : courseData;
  } catch (error) {
    console.error('Error parsing course data:', error);
    showError('Invalid course data format');
    return;
  }
  
  // Update the assessment header with course information
  updateAssessmentHeader(parsedCourseData);
  
  // Load assessment data
  loadAssessmentData();
};

// Initialize the assessment when the page loads (for standalone testing)
document.addEventListener('DOMContentLoaded', function() {
  // Only auto-load if no course data is provided (standalone mode)
  if (!window.courseData) {
    loadAssessmentData();
  }
});

// Load and parse the assessment data from data.json
async function loadAssessmentData() {
  try {
    const response = await fetch('./data.json');
    const data = await response.json();
    window.assessmentData = data;
    renderAssessment(data);
  } catch (error) {
    console.error('Error loading assessment data:', error);
    showError('Failed to load assessment data. Please refresh the page and try again.');
  }
}

// Update assessment header with course information
function updateAssessmentHeader(courseData) {
  const headerElement = document.querySelector('.assessment-header');
  if (!headerElement || !courseData || !Array.isArray(courseData) || courseData.length === 0) {
    return;
  }
  
  // Get course information from the first record
  const firstRecord = courseData[0];
  const fieldData = firstRecord.fieldData;
  
  if (fieldData) {
    const program = fieldData.program || 'Unknown Program';
    const classNumber = fieldData.classNumber || 'Unknown Class';
    const contactCount = courseData.filter(record => record.fieldData.contact && record.fieldData.contact.trim()).length;
    
    headerElement.innerHTML = `
      <h1>Soft Skills Assessment</h1>
      <p style="margin: 5px 0 0 0; opacity: 0.9;">
        <strong>Program:</strong> ${program} | 
        <strong>Class:</strong> ${classNumber} | 
        <strong>Participants:</strong> ${contactCount}
      </p>
      <p style="margin: 5px 0 0 0; opacity: 0.8; font-size: 14px;">
        Complete the assessment by selecting the appropriate level for each skill area.
      </p>
    `;
  }
}

// Render the complete assessment form
function renderAssessment(data) {
  const container = document.getElementById('assessmentSections');
  container.innerHTML = '';
  
  // Group data by header
  const groupedData = groupByHeader(data);
  
  Object.keys(groupedData).forEach((header, headerIndex) => {
    const section = createAssessmentSection(header, groupedData[header], headerIndex);
    container.appendChild(section);
  });
  
  updateProgressBar();
}

// Group assessment items by header
function groupByHeader(data) {
  const grouped = {};
  
  data.forEach((item, index) => {
    const header = item.Header || 'General Assessment';
    if (!grouped[header]) {
      grouped[header] = [];
    }
    
    // Add index to track original position
    item.originalIndex = index;
    grouped[header].push(item);
  });
  
  return grouped;
}

// Create a section for each header group
function createAssessmentSection(header, items, sectionIndex) {
  const section = document.createElement('div');
  section.className = 'assessment-section';
  section.id = `section-${sectionIndex}`;
  
  // Section header
  const sectionHeader = document.createElement('div');
  sectionHeader.className = 'section-header';
  sectionHeader.onclick = () => toggleSection(sectionIndex);
  
  const headerTitle = document.createElement('h3');
  headerTitle.textContent = header;
  
  const toggle = document.createElement('span');
  toggle.className = 'section-toggle';
  toggle.textContent = '▼';
  toggle.id = `toggle-${sectionIndex}`;
  
  sectionHeader.appendChild(headerTitle);
  sectionHeader.appendChild(toggle);
  
  // Section content
  const sectionContent = document.createElement('div');
  sectionContent.className = 'section-content';
  sectionContent.id = `content-${sectionIndex}`;
  
  // Add instruction if available
  const firstItem = items[0];
  if (firstItem && firstItem.HeaderInstruction && firstItem.HeaderInstruction.trim()) {
    const instruction = document.createElement('div');
    instruction.className = 'section-instruction';
    instruction.style.cssText = 'background: #e8f4fd; padding: 15px; margin-bottom: 20px; border-radius: 4px; color: #0c5460; border-left: 4px solid #0091CE;';
    instruction.innerHTML = `<strong>Instructions:</strong> ${firstItem.HeaderInstruction}`;
    sectionContent.appendChild(instruction);
  }
  
  // Render each item in the section
  items.forEach((item, itemIndex) => {
    const assessmentItem = createAssessmentItem(item, sectionIndex, itemIndex);
    sectionContent.appendChild(assessmentItem);
  });
  
  section.appendChild(sectionHeader);
  section.appendChild(sectionContent);
  
  return section;
}

// Create individual assessment item
function createAssessmentItem(item, sectionIndex, itemIndex) {
  const itemDiv = document.createElement('div');
  itemDiv.className = 'assessment-item';
  itemDiv.id = `item-${item.originalIndex}`;
  
  // Skip rendering if this is just an instruction item
  if (item.Type === 'Subsummary' && !item.Question) {
    itemDiv.innerHTML = `
      <div class="item-subheader">${item.Subheader}</div>
    `;
    return itemDiv;
  }
  
  // Item header
  const itemHeader = document.createElement('div');
  itemHeader.className = 'item-header';
  
  if (item.Subheader && item.Subheader.trim()) {
    const subheader = document.createElement('div');
    subheader.className = 'item-subheader';
    subheader.textContent = item.Subheader;
    itemHeader.appendChild(subheader);
  }
  
  if (item.Question && item.Question.trim()) {
    const question = document.createElement('div');
    question.className = 'item-question';
    question.textContent = item.Question;
    itemHeader.appendChild(question);
  }
  
  itemDiv.appendChild(itemHeader);
  
  // Render based on type
  switch (item.Type) {
    case 'Multiple Choice':
      renderMultipleChoice(itemDiv, item);
      break;
    case 'Free Text':
      renderFreeText(itemDiv, item);
      break;
    case 'Drop Down':
      renderDropDown(itemDiv, item);
      break;
    default:
      console.warn('Unknown item type:', item.Type);
  }
  
  return itemDiv;
}

// Render multiple choice options
function renderMultipleChoice(container, item) {
  const optionsContainer = document.createElement('div');
  optionsContainer.className = 'options-container';
  
  const options = [
    { value: '1', title: item.Option1, description: item.OptionDescription1 },
    { value: '2', title: item.Option2, description: item.OptionDescription2 },
    { value: '3', title: item.Option3, description: item.OptionDescription3 },
    { value: '4', title: item.Option4, description: item.OptionDescription4 }
  ];
  
  options.forEach(option => {
    if (option.title && option.title.trim()) {
      const optionCard = document.createElement('div');
      optionCard.className = 'option-card';
      optionCard.onclick = () => selectOption(item.originalIndex, option.value, optionCard);
      
      optionCard.innerHTML = `
        <div class="radio-indicator"></div>
        <div class="option-title">${option.title}</div>
        ${option.description ? `<div class="option-description">${option.description}</div>` : ''}
      `;
      
      optionsContainer.appendChild(optionCard);
    }
  });
  
  container.appendChild(optionsContainer);
}

// Render free text input
function renderFreeText(container, item) {
  const textArea = document.createElement('textarea');
  textArea.className = 'text-input';
  textArea.placeholder = 'Enter your response here...';
  textArea.onchange = () => {
    window.assessmentResponses[item.originalIndex] = {
      type: 'Free Text',
      value: textArea.value,
      timestamp: new Date().toISOString()
    };
    updateProgressBar();
  };
  
  container.appendChild(textArea);
}

// Render dropdown interface
function renderDropDown(container, item) {
  const dropdownContainer = document.createElement('div');
  dropdownContainer.className = 'dropdown-container';
  
  // Create column headers and inputs
  const columns = [
    { label: item.Option1, key: 'standard', type: 'text', readonly: true, value: item.OptionDescription1 },
    { label: item.Option2, key: 'status', type: 'select', options: ['Not Met', 'Partially Met', 'Fully Met'] },
    { label: item.Option3, key: 'comments', type: 'text', placeholder: 'Enter comments...' },
    { label: item.Option4, key: 'readiness', type: 'select', options: ['Low', 'Medium', 'High'] }
  ];
  
  columns.forEach(column => {
    const dropdownGroup = document.createElement('div');
    dropdownGroup.className = 'dropdown-group';
    
    const label = document.createElement('div');
    label.className = 'dropdown-label';
    label.textContent = column.label;
    dropdownGroup.appendChild(label);
    
    let input;
    if (column.type === 'select') {
      input = document.createElement('select');
      input.className = 'dropdown-select';
      
      // Add empty option
      const emptyOption = document.createElement('option');
      emptyOption.value = '';
      emptyOption.textContent = 'Select...';
      input.appendChild(emptyOption);
      
      // Add options
      column.options.forEach(optionText => {
        const option = document.createElement('option');
        option.value = optionText;
        option.textContent = optionText;
        input.appendChild(option);
      });
    } else {
      input = document.createElement('input');
      input.type = 'text';
      input.className = 'dropdown-input';
      if (column.placeholder) input.placeholder = column.placeholder;
      if (column.readonly) {
        input.readOnly = true;
        input.value = column.value || '';
        input.style.backgroundColor = '#f8f9fa';
      }
    }
    
    input.onchange = () => {
      if (!window.assessmentResponses[item.originalIndex]) {
        window.assessmentResponses[item.originalIndex] = {
          type: 'Drop Down',
          values: {},
          timestamp: new Date().toISOString()
        };
      }
      window.assessmentResponses[item.originalIndex].values[column.key] = input.value;
      updateProgressBar();
    };
    
    dropdownGroup.appendChild(input);
    dropdownContainer.appendChild(dropdownGroup);
  });
  
  container.appendChild(dropdownContainer);
}

// Handle option selection for multiple choice
function selectOption(itemIndex, value, selectedCard) {
  // Remove selected class from siblings
  const parent = selectedCard.parentNode;
  Array.from(parent.children).forEach(card => {
    card.classList.remove('selected');
  });
  
  // Add selected class to clicked card
  selectedCard.classList.add('selected');
  
  // Store response
  window.assessmentResponses[itemIndex] = {
    type: 'Multiple Choice',
    value: value,
    timestamp: new Date().toISOString()
  };
  
  updateProgressBar();
}

// Toggle section visibility
function toggleSection(sectionIndex) {
  const content = document.getElementById(`content-${sectionIndex}`);
  const toggle = document.getElementById(`toggle-${sectionIndex}`);
  
  if (content.classList.contains('collapsed')) {
    content.classList.remove('collapsed');
    toggle.textContent = '▼';
  } else {
    content.classList.add('collapsed');
    toggle.textContent = '▶';
  }
}

// Update progress bar
function updateProgressBar() {
  const totalItems = window.assessmentData ? window.assessmentData.filter(item => 
    item.Type === 'Multiple Choice' || item.Type === 'Free Text' || item.Type === 'Drop Down'
  ).length : 0;
  
  const completedItems = Object.keys(window.assessmentResponses).length;
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
  
  const progressBar = document.getElementById('progressBar');
  if (progressBar) {
    progressBar.style.width = `${progress}%`;
  }
}

// Reset form
window.resetForm = function() {
  if (confirm('Are you sure you want to reset the form? All responses will be lost.')) {
    window.assessmentResponses = {};
    loadAssessmentData(); // Reload the form
  }
};

// Save progress
window.saveProgress = function() {
  try {
    localStorage.setItem('assessmentProgress', JSON.stringify({
      responses: window.assessmentResponses,
      timestamp: new Date().toISOString()
    }));
    
    showSuccess('Progress saved successfully!');
  } catch (error) {
    console.error('Error saving progress:', error);
    showError('Failed to save progress. Please try again.');
  }
};

// Load saved progress
function loadProgress() {
  try {
    const saved = localStorage.getItem('assessmentProgress');
    if (saved) {
      const data = JSON.parse(saved);
      window.assessmentResponses = data.responses || {};
      
      // Restore form state
      Object.keys(window.assessmentResponses).forEach(itemIndex => {
        const response = window.assessmentResponses[itemIndex];
        restoreFormState(itemIndex, response);
      });
      
      updateProgressBar();
      showSuccess('Progress loaded successfully!');
    }
  } catch (error) {
    console.error('Error loading progress:', error);
    showError('Failed to load saved progress.');
  }
}

// Restore form state from saved data
function restoreFormState(itemIndex, response) {
  const itemElement = document.getElementById(`item-${itemIndex}`);
  if (!itemElement) return;
  
  switch (response.type) {
    case 'Multiple Choice': {
      const options = itemElement.querySelectorAll('.option-card');
      options.forEach((option, index) => {
        if ((index + 1).toString() === response.value) {
          option.classList.add('selected');
        }
      });
      break;
    }
      
    case 'Free Text': {
      const textArea = itemElement.querySelector('.text-input');
      if (textArea) {
        textArea.value = response.value || '';
      }
      break;
    }
      
    case 'Drop Down': {
      if (response.values) {
        Object.keys(response.values).forEach(key => {
          const input = itemElement.querySelector(`[data-key="${key}"]`);
          if (input) {
            input.value = response.values[key];
          }
        });
      }
      break;
    }
  }
}

// Submit assessment
window.submitAssessment = function() {
  const totalItems = window.assessmentData ? window.assessmentData.filter(item => 
    item.Type === 'Multiple Choice' || item.Type === 'Free Text' || item.Type === 'Drop Down'
  ).length : 0;
  
  const completedItems = Object.keys(window.assessmentResponses).length;
  
  if (completedItems < totalItems) {
    const proceed = confirm(`You have completed ${completedItems} out of ${totalItems} items. Do you want to submit anyway?`);
    if (!proceed) return;
  }
  
  // Generate results
  const results = generateResults();
  showResults(results);
};

// Generate assessment results
function generateResults() {
  const results = {
    completedAt: new Date().toISOString(),
    totalItems: window.assessmentData ? window.assessmentData.filter(item => 
      item.Type === 'Multiple Choice' || item.Type === 'Free Text' || item.Type === 'Drop Down'
    ).length : 0,
    completedItems: Object.keys(window.assessmentResponses).length,
    responses: window.assessmentResponses,
    summary: {}
  };
  
  // Generate summary by category
  if (window.assessmentData) {
    const groupedData = groupByHeader(window.assessmentData);
    
    Object.keys(groupedData).forEach(header => {
      const items = groupedData[header];
      const responses = items.map(item => window.assessmentResponses[item.originalIndex]).filter(Boolean);
      
      results.summary[header] = {
        totalItems: items.filter(item => item.Type === 'Multiple Choice' || item.Type === 'Free Text' || item.Type === 'Drop Down').length,
        completedItems: responses.length,
        averageScore: calculateAverageScore(responses)
      };
    });
  }
  
  return results;
}

// Calculate average score for multiple choice responses
function calculateAverageScore(responses) {
  const multipleChoiceResponses = responses.filter(r => r && r.type === 'Multiple Choice');
  if (multipleChoiceResponses.length === 0) return null;
  
  const total = multipleChoiceResponses.reduce((sum, response) => {
    return sum + parseInt(response.value);
  }, 0);
  
  return (total / multipleChoiceResponses.length).toFixed(2);
}

// Show results modal
function showResults(results) {
  const modal = document.getElementById('resultModal');
  const body = document.getElementById('resultModalBody');
  
  let html = `
    <div style="margin-bottom: 20px;">
      <h4>Assessment Summary</h4>
      <p><strong>Completed:</strong> ${new Date(results.completedAt).toLocaleString()}</p>
      <p><strong>Progress:</strong> ${results.completedItems} of ${results.totalItems} items completed (${((results.completedItems/results.totalItems)*100).toFixed(1)}%)</p>
    </div>
    
    <div style="margin-bottom: 20px;">
      <h4>Results by Category</h4>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #f8f9fa;">
            <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Category</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Completed</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Average Score</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  Object.keys(results.summary).forEach(category => {
    const summary = results.summary[category];
    html += `
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;">${category}</td>
        <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${summary.completedItems}/${summary.totalItems}</td>
        <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${summary.averageScore || 'N/A'}</td>
      </tr>
    `;
  });
  
  html += `
        </tbody>
      </table>
    </div>
  `;
  
  body.innerHTML = html;
  modal.style.display = 'block';
}

// Close results modal
window.closeResultModal = function() {
  const modal = document.getElementById('resultModal');
  modal.style.display = 'none';
};

// Export results
window.exportResults = function() {
  const results = generateResults();
  const dataStr = JSON.stringify(results, null, 2);
  const dataBlob = new Blob([dataStr], {type: 'application/json'});
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(dataBlob);
  link.download = `assessment-results-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
};

// Get assessment results for FileMaker
window.getAssessmentResults = function() {
  const results = generateResults();
  
  // Format for FileMaker consumption
  const fileMakerResults = {
    courseData: window.courseData,
    user: window.currentUser,
    date: window.currentDate,
    assessment: results,
    rawResponses: window.assessmentResponses
  };
  
  return JSON.stringify(fileMakerResults);
};

// Check if assessment is complete
window.isAssessmentComplete = function() {
  const totalItems = window.assessmentData ? window.assessmentData.filter(item => 
    item.Type === 'Multiple Choice' || item.Type === 'Free Text' || item.Type === 'Drop Down'
  ).length : 0;
  
  const completedItems = Object.keys(window.assessmentResponses).length;
  
  return {
    isComplete: completedItems >= totalItems,
    completedItems: completedItems,
    totalItems: totalItems,
    percentComplete: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0
  };
};

// Utility functions for notifications
function showSuccess(message) {
  showNotification(message, 'success');
}

function showError(message) {
  showNotification(message, 'error');
}

function showNotification(message, type) {
  // Create a simple notification
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 4px;
    color: white;
    font-weight: bold;
    z-index: 10000;
    max-width: 300px;
    ${type === 'success' ? 'background: #28a745;' : 'background: #dc3545;'}
  `;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    document.body.removeChild(notification);
  }, 3000);
}

// Load saved progress on page load
document.addEventListener('DOMContentLoaded', function() {
  // Small delay to ensure assessment data is loaded first
  setTimeout(loadProgress, 500);
});
