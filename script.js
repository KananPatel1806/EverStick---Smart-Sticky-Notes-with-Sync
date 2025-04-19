$(document).ready(function () {
    let notes = JSON.parse(localStorage.getItem("notes")) || [];
    let searchQuery = localStorage.getItem("searchQuery") || "";

    function saveNotes() {
        localStorage.setItem("notes", JSON.stringify(notes));
    }

    function renderNotes(filteredNotes = notes) {
        $("#notes-container").html("");
    
        if (notes.length === 0) {
            $("#notes-container").html("<p class='no-notes'>No notes available.</p>");
            return;
        }
    
        filteredNotes.forEach((note, index) => {
            let noteElement = $(`
                <div class="note" style="background: ${note.color}" data-index="${index}">
                    <div class="note-content" contenteditable="true">${note.text}</div>
                    <div class="rich-toolbar">
                        <button class="format-btn" data-command="bold"><b>B</b></button>
                        <button class="format-btn" data-command="italic"><i>I</i></button>
                        <button class="format-btn" data-command="underline"><u>U</u></button>
                        <button class="format-btn" data-command="insertUnorderedList">• List</button>
                    </div>
                    <div class="note-actions">
                        <button class="edit-note">✍</button>
                        <button class="delete-note">🗑</button>
                        <button class="pin-note">${note.pinned ? "📍" : "📌"}</button>
                        <input type="color" class="color-picker" value="${note.color}">
                        <input type="datetime-local" class="reminder-time">
                        <button class="set-reminder">⏰</button>
                        <button class="share-note mt-2">📤 Share</button>  <!-- ✅ Add this button -->
                        <button class="export-note">📤 Export</button>  <!-- ✅ Export Button Added -->
                        <button class="import-note mt-2">📥 Import</button>  <!-- ✅ Import Button Added -->
                        <input type="file" class="import-file" style="display: none;">
                        
                    </div>
                </div>
            `);
    
            if (note.pinned) {
                $("#notes-container").prepend(noteElement);
            } else {
                $("#notes-container").append(noteElement);
            }
        });

        $(document).on("click", ".format-btn", function () {
            let command = $(this).data("command");
            let noteContent = $(this).closest(".note").find(".note-content")[0]; // Get the actual contenteditable div
        
            noteContent.focus(); // Ensure the note is focused before applying formatting
            document.execCommand(command, false, null);
        });
        

        bindShareNoteEvent();
    }
    

    $(document).on("click", ".set-reminder", function () {
        let index = $(this).closest(".note").data("index");
        let reminderTime = $(this).siblings(".reminder-time").val();

        if (!reminderTime) {
            alert("Please select a valid reminder time!");
            return;
        }

        let reminderDate = new Date(reminderTime).getTime();
        let currentTime = new Date().getTime();
        let timeDifference = reminderDate - currentTime;

        if (timeDifference < 0) {
            alert("Reminder time must be in the future!");
            return;
        }

        alert("Reminder set for this note!");

        setTimeout(() => {
            let message = `🔔 Reminder: ${notes[index].text}`;
            alert(message);

            // 🎤 Voice Reminder
            let speech = new SpeechSynthesisUtterance(message);
            speech.lang = "en-US";
            window.speechSynthesis.speak(speech);

        }, timeDifference);
    });

    function bindShareNoteEvent() {
        $(document).off("click", ".share-note").on("click", ".share-note", function () {
            console.log("✅ Share button clicked!");
            let index = $(this).closest(".note").data("index");
            let noteText = notes[index]?.text || "No content";
    
            if (!navigator.share) {
                alert("❌ Sharing is not supported in this browser.");
                console.error("Web Share API not available.");
                return;
            }
    
            navigator.share({
                title: "My Note",
                text: noteText,
            })
            .then(() => console.log("✅ Shared successfully!"))
            .catch((error) => console.error("❌ Error sharing:", error));
        });
    }

    $(document).on("click", "#add-note", function () {
        notes.push({ text: "New Note", color: "#ffff88", pinned: false });
        saveNotes();
        renderNotes();
    });


    $(document).on("click", ".delete-note", function () {
        let index = $(this).closest(".note").data("index");
        notes.splice(index, 1);
        saveNotes();
        renderNotes();
    });

    $(document).on("input", ".note-content", function () {
        let index = $(this).closest(".note").data("index");
        notes[index].text = $(this).text();
        saveNotes();
    });

    $(document).on("click", ".edit-note", function () {
        let noteElement = $(this).closest(".note").find(".note-content");
        noteElement.focus();
    });

    $(document).on("input", ".color-picker", function () {
        let index = $(this).closest(".note").attr("data-index"); // Ensure we get the correct index
        index = parseInt(index); // Convert to integer
    
        if (!isNaN(index) && typeof notes[index] !== "undefined") {  
            notes[index].color = $(this).val();
            $(this).closest(".note").css("background", notes[index].color); // Apply color directly
            saveNotes(); 
        }
    });
    
    

    $(document).on("click", ".pin-note", function () {
        let index = $(this).closest(".note").data("index");
        notes[index].pinned = !notes[index].pinned;
        saveNotes();
        renderNotes();
    });

    $("#toggle-dark-mode").click(() => {
        $("body").toggleClass("dark-mode");
    });

    $("#search-bar").on("input", function () {
        searchQuery = $(this).val().toLowerCase();
        localStorage.setItem("searchQuery", searchQuery);
        let filteredNotes = notes.filter(note => note.text.toLowerCase().includes(searchQuery));
        renderNotes(filteredNotes);
    });



    // 📤 Export Single Note
$(document).on("click", ".export-note", function () {
    let index = $(this).closest(".note").data("index");
    let noteData = JSON.stringify(notes[index]);
    let blob = new Blob([noteData], { type: "application/json" });

    let a = $("<a>").attr("href", URL.createObjectURL(blob)).attr("download", `note_${index}.json`).appendTo("body");
    a[0].click();
    a.remove();
});

// 📥 Import Single Note
$(document).on("click", ".import-note", function () {
    $(this).siblings(".import-file").click();
});

$(document).on("change", ".import-file", function (event) {
    let file = event.target.files[0];
    if (!file) return;

    let reader = new FileReader();
    let noteElement = $(this).closest(".note");
    let index = noteElement.data("index");

    reader.onload = function (e) {
        try {
            let importedNote = JSON.parse(e.target.result);
            if (!importedNote.text || !importedNote.color) {
                alert("❌ Invalid note format!");
                return;
            }

            // Update note
            notes[index] = importedNote;
            saveNotes();
            renderNotes();
            alert("✅ Note imported successfully!");
        } catch (error) {
            alert("❌ Error importing note! Make sure it is a valid JSON file.");
        }
    };

    reader.readAsText(file);
});






    // 🎤 **Voice Input for Adding Notes**
    $("#start-voice").click(function () {
        if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
            alert("Speech Recognition is not supported in this browser.");
            return;
        }

        let recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = "en-US";
        recognition.start();

        recognition.onresult = function (event) {
            let spokenText = event.results[0][0].transcript;
            notes.push({ text: spokenText, color: "#ffff88", pinned: false });
            saveNotes();
            renderNotes();
            alert(`✅ Note added: "${spokenText}"`);
        };

        recognition.onerror = function (event) {
            alert("Speech Recognition Error: " + event.error);
        };
    });

    // 📤 **Share Note Feature**
    $(document).on("click", ".share-note", function () {
        console.log("Share button clicked!"); // Debugging log
    
        let index = $(this).closest(".note").data("index");
        let noteText = notes[index]?.text || "No content";
    
        if (!navigator.share) {
            alert("❌ Sharing is not supported in this browser.");
            console.error("Web Share API not available.");
            return;
        }
    
        navigator.share({
            title: "My Note",
            text: noteText,
        })
        .then(() => console.log("✅ Shared successfully!"))
        .catch((error) => console.error("❌ Error sharing:", error));
    });
    

    // 📄 **Download Notes as PDF**
    $("#download-pdf").click(function () {
        const { jsPDF } = window.jspdf;
        let doc = new jsPDF();

        let noteContent = $("#download-note").val().trim();
        if (!noteContent) {
            alert("Nothing to download. Please write something.");
            return;
        }

        doc.text(noteContent, 10, 10);
        doc.save("note.pdf");
    });

    renderNotes();
});
