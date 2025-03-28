document.addEventListener('DOMContentLoaded', async function () {
    const generateButton = document.querySelector('.btn');
    const inputArea = document.querySelector('.input-area textarea');
    const outputArea = document.querySelector('.output-area');
    const cookieConsentPopup = document.getElementById('cookie-consent-popup');
    const acceptCookiesButton = document.querySelector('.acceptButton');
    const declineCookiesButton = document.querySelector('.declineButton');
    const redirectToPopupButton = document.getElementById('redirect-to-popup');
    const cookieErrorMessage = document.querySelector('.cookie-error-message');
    const consent = Cookies.get('cookieConsent');

    // Ensure all elements exist
    if (!generateButton || !inputArea || !outputArea || !cookieConsentPopup || !acceptCookiesButton || !declineCookiesButton || !cookieErrorMessage) {
        console.error('One or more elements are missing in the DOM.');
        return;
    }

    // Check cookie consent status
    const checkCookieConsent = () => {
        const consent = Cookies.get('cookieConsent');
        if (consent === 'accepted') {
            cookieConsentPopup.style.display = 'none';
            document.body.classList.remove('no-scroll');
            cookieErrorMessage.style.display = 'none';
        } else if (consent === 'declined') {
            cookieConsentPopup.style.display = 'none'; // Hide popup but keep error message
            document.body.classList.remove('no-scroll');
            cookieErrorMessage.style.display = 'block';
            // Clear history when cookies are declined
            localStorage.removeItem('history');
        } else {
            // Only show the consent popup if no choice has been made yet
            cookieConsentPopup.style.display = 'flex';
            document.body.classList.add('no-scroll');
            cookieErrorMessage.style.display = 'none';
        }
    };

    // Handle accept cookies
    acceptCookiesButton.addEventListener('click', () => {
        Cookies.set('cookieConsent', 'accepted', { expires: 30 });
        cookieConsentPopup.style.display = 'none';
        document.body.classList.remove('no-scroll'); // Allow scrolling
        cookieErrorMessage.style.display = 'none'; // Hide error message
        displayHistory(); // Refresh history display
        console.log('Cookies accepted');
    });

    // Handle decline cookies
    declineCookiesButton.addEventListener('click', () => {
        Cookies.set('cookieConsent', 'declined', { expires: 30 });
        cookieConsentPopup.style.display = 'none';
        document.body.classList.remove('no-scroll'); // Allow scrolling
        cookieErrorMessage.style.display = 'block'; // Show error message
        showPopup('History disabled. Please accept cookies to enable history.', true); // Show popup message
        displayHistory(); // Refresh history display
        console.log('Cookies declined');
    });

    // Redirect to cookie consent popup
    if (redirectToPopupButton) {
        redirectToPopupButton.addEventListener('click', () => {
            cookieErrorMessage.style.display = 'none'; // Hide error message
            cookieConsentPopup.style.display = 'flex'; // Show cookie consent popup
            deleteButton.style.display = 'none'; // Hide delete button
            document.body.classList.add('no-scroll'); // Prevent scrolling
        });
    }

    const model1Checkbox = document.getElementById('model1');
    const model2Checkbox = document.getElementById('model2');

    // Ensure only one checkbox is selected at a time
    model1Checkbox.addEventListener('change', () => {
        if (model1Checkbox.checked) {
            model2Checkbox.checked = false;
        }
    });

    model2Checkbox.addEventListener('change', () => {
        if (model2Checkbox.checked) {
            model1Checkbox.checked = false;
        }
    });

    // Close the menu when a checkbox is checked or unchecked
    model1Checkbox.addEventListener('change', () => {
        document.getElementById('models-menu').classList.remove('open');
        document.getElementById('models-menu-button').classList.remove('active');
    });

    model2Checkbox.addEventListener('change', () => {
        document.getElementById('models-menu').classList.remove('open');
        document.getElementById('models-menu-button').classList.remove('active');
    });

    // Function to query the selected model
    const queryImage = async (prompt, HF_API_KEY, SEGMIND_API_KEY) => {
        try {
            let modelUrl;
            let requestOptions;

            // Original HuggingFace models handling
            if (model1Checkbox.checked) {
                modelUrl = "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-dev";
            } else if (model2Checkbox.checked) {
                modelUrl = "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell";
            } else {
                // Default to model1 if nothing is selected
                model1Checkbox.checked = true;
                modelUrl = "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-dev";
            }

            requestOptions = {
                headers: {
                    Authorization: `Bearer ${HF_API_KEY}`,
                    "Content-Type": "application/json",
                },
                method: "POST",
                body: JSON.stringify({ inputs: prompt }),
            };

            const response = await fetch(modelUrl, requestOptions);

            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }

            return await response.blob();
        } catch (error) {
            console.error('Error generating image:', error);
            alert('Failed to generate the image. Please try again.');
            return null;
        }
    };

    // Function to convert blob to data URL
    const blobToDataURL = (blob, callback) => {
        const reader = new FileReader();
        reader.onload = function (e) {
            callback(e.target.result);
        };
        reader.readAsDataURL(blob);
    };

    // Function to save history to local storage
    const saveToHistory = async (prompt, imageBlob) => {
        return new Promise((resolve) => {
            const consent = Cookies.get('cookieConsent');
            if (consent === 'accepted') {
                blobToDataURL(imageBlob, (dataUrl) => {
                    const history = getHistory();
                    const modelUsed = model1Checkbox.checked
                        ? "Flux.1-dev"
                        : model2Checkbox.checked
                        ? "Flux.1-Schnell"
                        : "Flux.1-dev"; // Default if none selected
                    history.push({ prompt, imageUrl: dataUrl, modelUsed });
                    localStorage.setItem('history', JSON.stringify(history));
                    console.log('History saved:', history);
                    resolve();
                });
            } else {
                resolve();
            }
        });
    };

    // Function to retrieve history from local storage
    const getHistory = () => {
        const historyValue = localStorage.getItem('history');
        if (historyValue) {
            try {
                return JSON.parse(historyValue); // Parse the history
            } catch (error) {
                console.error("Error fetching history from local storage:", error);
            }
        }
        return []; // Return an empty array if no history exists
    };

    // Function to display history in the history viewer
    const displayHistory = () => {
        const historyContainer = document.querySelector('.history-container');
        const deleteButton = document.querySelector('.delete-history-btn');
        const noHistoryMessage = document.querySelector('.no-history-message');
        const history = getHistory();
        const consent = Cookies.get('cookieConsent');

        if (consent === 'declined') {
            // Hide history elements when cookies are declined
            historyContainer.style.display = 'none';
            deleteButton.style.display = 'none';
            noHistoryMessage.style.display = 'none';
            return;
        }

        if (history.length === 0) {
            noHistoryMessage.style.display = 'block'; // Show no history message
            historyContainer.innerHTML = ''; // Clear history container
            deleteButton.style.display = 'none'; // Hide delete button
            return;
        }

        noHistoryMessage.style.display = 'none'; // Hide no history message
        historyContainer.innerHTML = history
            .map(
                (item, index) => `
                <div class="history-item">
                    <p><strong>Prompt ${index + 1}:</strong> ${item.prompt}</p>
                    <p><strong>Model Used:</strong> ${item.modelUsed}</p>
                    <img src="${item.imageUrl}" alt="Generated Image ${index + 1}" class="history-image">
                    <div class="button-group">
                        <a href="${item.imageUrl}" download="hist-download-${index + 1}.png" class="download-button">
                            <i class="fas fa-download"></i> Download
                        </a>
                        <button class="share-h" data-url="${item.imageUrl}">
                            <span data-text-end="Shared!" data-text-initial="Share" class="tooltip"></span>
                            <span class="material-icons">
                                share
                            </span>
                        </button>
                    </div>
                </div>
            `
            )
            .join('');

        deleteButton.style.display = 'block'; // Show delete button

        // Add event listeners for share buttons
        document.querySelectorAll('.share-h').forEach(button => {
            button.addEventListener('click', () => {
                const imageUrl = button.getAttribute('data-url');
                shareImage(imageUrl);
            });
        });
    };

    // Function to clear history
    const clearHistory = () => {
        localStorage.removeItem('history');
        displayHistory(); // Refresh the history display
    };

    // Add event listener for the delete history button
    document.querySelector('.delete-history-btn').addEventListener('click', clearHistory);

    // Call displayHistory on page load
    displayHistory();

    // Call checkCookieConsent on page load
    checkCookieConsent();

    // Function to show loading animation
    const showLoadingAnimation = () => {
        outputArea.innerHTML = `
            <div class="ui-abstergo">
                <div class="abstergo-loader">
                    <div></div>
                    <div></div>
                    <div></div>
                </div>
                <div class="ui-text">
                    Generating
                    <div class="ui-dot"></div>
                    <div class="ui-dot"></div>
                    <div class="ui-dot"></div>
                </div>
            </div>
        `;
        generateButton.innerHTML = `<span class="spinner"></span> Generating...`;
        generateButton.disabled = true;
    };

    // Function to hide loading animation
    const hideLoadingAnimation = () => {
        generateButton.innerHTML = `
            <svg height="24" width="24" fill="#FFFFFF" viewBox="0 0 24 24" data-name="Layer 1" id="Layer_1" class="sparkle">
                <path d="M10,21.236,6.755,14.745.264,11.5,6.755,8.255,10,1.764l3.245,6.491L19.736,11.5l-6.491,3.245ZM18,21l1.5,3L21,21l3-1.5L21,18l-1.5-3L18,18l-3,1.5ZM19.333,4.667,20.5,7l1.167-2.333L24,3.5,21.667,2.333,20.5,0,19.333,2.333,17,3.5z"></path>
            </svg>
            <span class="text">Generate</span>
        `; // Reset button text with spark effect
        generateButton.disabled = false; // Re-enable the button
    };

    // Function to show error message
    const showError = (message) => {
        outputArea.innerHTML = `
            <div class="error-message">
                <span class="material-icons" style="font-size: 48px; color: #d65563;">error</span>
                <p>${message}</p>
            </div>
        `;
    };

    // Function to share image
    const shareImage = (imageUrl) => {
        console.log('Sharing URL:', imageUrl); // Debug the URL
        if (navigator.share) {
            fetch(imageUrl)
                .then(response => response.blob())
                .then(blob => {
                    const file = new File([blob], "shared-image.png", { type: blob.type });
                    navigator.share({
                        title: 'Check out this image ! from Devil Creations',
                        files: [file] // Use the file for sharing
                    }).then(() => {
                        console.log('Thanks for sharing!');
                    }).catch((error) => {
                        console.error('Error sharing:', error);
                    });
                })
                .catch(error => {
                    console.error('Error fetching blob:', error);
                });
        } else {
            alert('Sharing is not supported on this browser.');
        }
    };

    // Function to fetch sensitive words from config.json
    const fetchSensitiveWords = async () => {
        try {
            const response = await fetch('config.json');
            const data = await response.json();
            return data.sensitiveWords; // Return the sensitive words array
        } catch (error) {
            console.error('Error fetching sensitive words:', error);
            return []; // Return an empty array if there's an error
        }
    };

    // Handle image generation - update to wait for history save
    const generateImage = async (prompt, HF_API_KEY, SEGMIND_API_KEY) => {
        console.log("Generate image function called with prompt:", prompt);
        console.log("Model selections:", { 
            model1: model1Checkbox.checked, 
            model2: model2Checkbox.checked 
        });
        console.log("API keys available:", { 
            HF_API_KEY: !!HF_API_KEY, 
            SEGMIND_API_KEY: !!SEGMIND_API_KEY 
        });
        
        showLoadingAnimation();

        try {
            const sensitiveWords = await fetchSensitiveWords();
            if (containsSensitiveWords(prompt, sensitiveWords)) {
                showError('SENSITIVE WORDS NOT ALLOWED !. Please try again with a different prompt.');
                return;
            }

            // Check if a model is selected
            if (!model1Checkbox.checked && !model2Checkbox.checked) {
                // If no model is selected, default to model1
                model1Checkbox.checked = true;
            }

            const imageBlob = await queryImage(prompt, HF_API_KEY, SEGMIND_API_KEY);
            if (imageBlob) {
                const imageUrl = URL.createObjectURL(imageBlob);
                outputArea.innerHTML = `
                    <img src="${imageUrl}" alt="Generated Image" class="generated-image">
                    <div class="button-group">
                        <a href="${imageUrl}" download="generated-image.png" class="dbutton">
                            <div class="points_wrapper">
                                <i class="point"></i>
                                <i class="point"></i>
                                <i class="point"></i>
                                <i class="point"></i>
                                <i class="point"></i>
                                <i class="point"></i>
                                <i class="point"></i>
                                <i class="point"></i>
                                <i class="point"></i>
                                <i class="point"></i>
                            </div>
                            <span class="inner">
                                <i class="fas fa-download"></i>
                                Download Image
                            </span>
                        </a>
                        <button class="sbutton" data-url="${imageUrl}">
                            <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" class="sicon">
                                <path d="M307 34.8c-11.5 5.1-19 16.6-19 29.2v64H176C78.8 128 0 206.8 0 304C0 417.3 81.5 467.9 100.2 478.1c2.5 1.4 5.3 1.9 8.1 1.9c10.9 0 19.7-8.9 19.7-19.7c0-7.5-4.3-14.4-9.8-19.5C108.8 431.9 96 414.4 96 384c0-53 43-96 96-96h96v64c0 12.6 7.4 24.1 19 29.2s25 3 34.4-5.4l160-144c6.7-6.1 10.6-14.7 10.6-23.8s-3.8-17.7-10.6-23.8l-160-144c-9.4-8.5-22.9-10.6-34.4-5.4z"></path>
                            </svg>
                            Share
                        </button>
                    </div>
                `;

                // Wait for history to be saved before updating display
                await saveToHistory(prompt, imageBlob);
                displayHistory(); // Now display history after save is complete

                // Add event listener for the share button
                document.querySelector('.sbutton').addEventListener('click', () => {
                    shareImage(imageUrl);
                });
            } else {
                showError('Image generation failed. Please try again.');
            }
        } catch (error) {
            console.error("Error generating image:", error);
            showError('Image generation failed. Please try again.');
        } finally {
            hideLoadingAnimation();
        }
    };

    // Fetch the API keys and sensitive words from config.json
    const fetchApiKeys = async () => {
        try {
            const response = await fetch('config.json');
            const data = await response.json();
            return { 
                HF_API_KEY: data.HF_API_KEY, 
                SEGMIND_API_KEY: data.SEGMIND_API_KEY,
                sensitiveWords: data.sensitiveWords 
            };
        } catch (error) {
            console.error('Error fetching API keys:', error);
            alert('Failed to load API keys.');
            return null;
        }
    };

    // Check if prompt contains sensitive words
    const containsSensitiveWords = (prompt, sensitiveWords) => {
        const promptWords = prompt.toLowerCase().split(/\s+/);
        return sensitiveWords.some(word => promptWords.includes(word.toLowerCase()));
    };

    // Add event listener to the generate button
    generateButton.addEventListener('click', async (event) => {
        event.preventDefault();
        const prompt = inputArea.value.trim();
        const { HF_API_KEY, SEGMIND_API_KEY, sensitiveWords } = await fetchApiKeys();
        if (prompt) {
            if (containsSensitiveWords(prompt, sensitiveWords)) {
                showError('SENSITIVE WORDS NOT ALLOWED');
            } else {
                generateImage(prompt, HF_API_KEY, SEGMIND_API_KEY);
            }
        } else {
            showError('Please enter a prompt to generate an image!');
        }
    });

    // Add event listener for the generate history button
    document.querySelector('.generate-history-btn').addEventListener('click', (event) => {
        event.preventDefault(); // Prevent default button behavior
        const targetSection = document.getElementById('generate'); // Get the generating section
        const headerOffset = 60; // Offset for the fixed navbar
        const elementPosition = targetSection.offsetTop; // Get the position of the generating section
        const offsetPosition = elementPosition - headerOffset; // Calculate the position to scroll to

        // Smooth scroll to the generating section
        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    });

    emailjs.init("3Wmah-KXDugujWGcq");

    const fileInput = document.getElementById('report-files');
    const fileUploadArea = document.getElementById('file-upload-area');
    const deleteButton = document.getElementById('delete-upload'); // Get the delete button
    const fileUploadLabel = document.querySelector('.file-upload-label'); // Get the file upload label

    // Handle file selection
    fileInput.addEventListener('change', handleFileSelect);

    // Handle drag over event
    fileUploadArea.addEventListener('dragover', (event) => {
        event.preventDefault(); // Prevent default behavior
        fileUploadArea.classList.add('drag-over'); // Add a class to indicate drag over
    });

    // Handle drag leave event
    fileUploadArea.addEventListener('dragleave', () => {
        fileUploadArea.classList.remove('drag-over'); // Remove drag over class
    });

    // Handle drop event
    fileUploadArea.addEventListener('drop', (event) => {
        event.preventDefault(); // Prevent default behavior
        fileUploadArea.classList.remove('drag-over'); // Remove drag over class
        const files = event.dataTransfer.files; // Get the dropped files
        if (files.length > 0) {
            handleFileSelect({ target: { files } }); // Call the file select handler
        }
    });

    function handleFileSelect(event) {
        const file = event.target.files[0]; // Get the first file selected

        // Check if the file is an image
        if (!file.type.startsWith('image/')) {
            showPopup('Only images are allowed! Please upload an image.', true); // Show red popup
            // Clear the file input
            fileInput.value = '';
            deleteButton.style.display = 'none'; // Hide delete button
            fileInput.disabled = false; // Keep the file input enabled
            fileUploadLabel.classList.remove('disabled'); // Remove disabled class
            fileUploadLabel.textContent = 'Attach Files (optional)'; // Reset label text
            return; // Exit the function
        }

        // Check if the file size exceeds 10 MB
        if (file.size > 10 * 1024 * 1024) {  // 10 MB limit
            showPopup('Image is too large! Please upload a smaller image.', true); // Show red popup
            // Clear the file input
            fileInput.value = '';
            deleteButton.style.display = 'none'; // Hide delete button
            fileInput.disabled = false; // Keep the file input enabled
            fileUploadLabel.classList.remove('disabled'); // Remove disabled class
            fileUploadLabel.textContent = 'Attach Files (optional)'; // Reset label text
            return; // Exit the function
        }

        // If the file is valid, update the button text
        deleteButton.style.display = 'inline-block'; // Show the delete button
        fileInput.disabled = true; // Disable the file input only for valid images
        fileUploadLabel.classList.add('disabled'); // Add disabled class only for valid images
        fileUploadLabel.textContent = 'File Uploaded'; // Update label text
    }

    // Add this code to handle the delete upload button
    deleteButton.addEventListener('click', function() {
        // Clear the file input
        fileInput.value = '';

        // Hide the delete button since there are no images left
        this.style.display = 'none';

        // Re-enable the file input
        fileInput.disabled = false; 
        fileUploadLabel.classList.remove('disabled'); // Remove disabled class from label
        fileUploadLabel.textContent = 'Attach Files (optional)'; // Reset label text
    });

    // Handle form submission to send report email
    document.getElementById('report-form').addEventListener('submit', async function(event) {
        event.preventDefault();

        const details = document.getElementById('report-details').value;
        const file = fileInput.files[0];

        try {
            let response;
            if (file) {
                const reader = new FileReader();
                const base64Image = await new Promise((resolve) => {
                    reader.onload = (e) => resolve(e.target.result);
                    reader.readAsDataURL(file);
                });

                response = await emailjs.send("service_v1t7jls", "template_2ut47fb", {
                    from_name: "User(Devil Creations)",
                    message: details,
                    to_email: "antonginoja200@gmail.com",
                    image: base64Image
                });
            } else {
                response = await emailjs.send("service_v1t7jls", "template_2ut47fb", {
                    from_name: "User(Devil Creations)",
                    message: details,
                    to_email: "antonginoja200@gmail.com"
                });
            }

            if (response.status === 200) {
                showPopup('Report submitted successfully!', false);
                this.reset();
                // Clear the image preview and reset upload button state
                fileInput.value = '';
                deleteButton.style.display = 'none';
                fileInput.disabled = false;
                fileUploadLabel.classList.remove('disabled');
                fileUploadLabel.textContent = 'Attach Files (optional)'; // Reset label text
            }
        } catch (error) {
            console.error('Error submitting report:', error);
            showPopup('Failed to submit report. Please try again.', true);
        }
    });

    // Function to show success/error popup
    function showPopup(message, isError) {
        const popup = document.getElementById('popup');
        popup.textContent = message;
        popup.className = isError ? 'popup error visible' : 'popup visible'; // Set class based on error or success
        popup.style.left = '50%'; // Center horizontally
        popup.style.marginTop = '20px'; // Ensure margin is applied

        // Hide the popup after 5 seconds
        setTimeout(() => {
            popup.classList.remove('visible');
            popup.style.left = '-300px'; // Move popup out of view
        }, 5000);
    }

    const modelsMenuButton = document.getElementById('models-menu-button');
    const modelsMenu = document.getElementById('models-menu');

    modelsMenuButton.addEventListener('click', () => {
        modelsMenuButton.classList.toggle('active');
        if (modelsMenu.classList.contains('open')) {
            modelsMenu.classList.remove('open');
        } else {
            modelsMenu.classList.add('open');
        }
    });
});
