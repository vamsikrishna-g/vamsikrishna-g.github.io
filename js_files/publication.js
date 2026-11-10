// Sample publication data with type (conference or journal)
const publications = [
    {
                author1:"Krishna, G.V.",
                author2:"Jothiprakash, V.",
                author3:"Sivakumar, B.",
                title: "Prediction of evapotranspiration using a nonlinear local approximation approach",
                date: "May 2022",
                confname:"EGU",
                type: "conference",
            },
            {
                author1:"Krishna, G.V.",
                author2:"Jothiprakash, V.",
                author3:"Sivakumar, B.",
                title: "Prediction of Evapotranspiration Using Complex Networks",
                date: "August 2022",
                confname:"AOGS",
                type: "conference",
            },
            {
                author1:"Krishna, G.V.",
                author2:"Jothiprakash, V.",
                author3:"Sivakumar, B.",
                title: "Behavioural study of Evapotranspiration time series: Visibility Graph Analysis",
                date: "December 2022",
                confname:"AGU",
                type: "conference",
            },
            {
                author1:"Krishna, G.V.",
                author2:"Jothiprakash, V.",
                author3:"Sivakumar, B.",
                title: "Monthly evapotranspiration trends across India using the Hurst exponent",
                date: "December 2022",
                confname:"HYDRO",
                type: "conference",
            },
            {
                author1:"Ramkumar, D.",
                author2:"Krishna, G.V.",
                title: "Comprehending Architecture and Varieties of Temple Tanks in India",
                date: "February 2023",
                confname:"IKS",
                type: "conference",
            },
            {
                author1:"Krishna, G.V.",
                author2:"Jothiprakash, V.",
                author3:"Sivakumar, B.",
                title: "Actual Evapotranspiration in India: Trend, Persistence, and Homogeneity",
                date: "In review",
                type: "journal",
                journalName: "ASCE"
            },
            {
                author1:"Krishna, G.V.",
                author2:"Jothiprakash, V.",
                author3:"Sivakumar, B.",
                title: "Analysis of Evapotranspiration using Complex Networks and Chaos Theory",
                date: "August 2023",
                confname:"AOGS",
                type: "conference",
            },
            {
                author1:"Krishna, G.V.",
                author2:"Jothiprakash, V.",
                author3:"Sivakumar, B.",
                title: "Dynamic Behaviour of Daily Evapotranspiration Time Series: Use of Visibility Graphs",
                date: "In review",
                type: "journal",
                journalName: "COMPAG"
                
            },
    {
                author1:"Krishna, G.V.",
                author2:"Jothiprakash, V.",
                author3:"Sivakumar, B.",
                title: "Analysis of Evapotranspiration Trends in India",
                date: "June 2025",
                confname:"EWRA",
                type: "conference",
            },
    {
                author1:"Krishna, G.V.",
                author3:"Sivakumar, B.",
                title: "Spatio-Temporal Modelling for Streamflow Prediction using Graph-based Machine Learning Framework",
                date: "August 2026",
                confname:"AOGS",
                type: "conference",
            },
    // More publication data entries...
];


function filterByType(type) {
    const publicationList = document.getElementById("publication-list");
    publicationList.innerHTML = ""; // Clear the current list

    const filteredPublications = type === "all" ? publications : publications.filter(pub => pub.type === type);

    filteredPublications.forEach(pub => {
        const listItem = document.createElement("li");
        
        // Format authors
        let authors = pub.author1;
        if (pub.author2) authors += `, ${pub.author2}`;
        if (pub.author3) authors += `, ${pub.author3}`;

        // Make the name "Krishna, G.V." bold if present
        authors = authors.replace("Krishna, G.V.", "<strong>Krishna, G.V.</strong>");

        // Format the citation
        let citation = "";
        if (pub.type === "journal") {
            citation = `${authors} (${pub.date}). ${pub.title}. <i>${pub.journalName}</i>.`;
        } else {
            citation = `${authors} (${pub.date}, ${pub.confname}). ${pub.title}.`;
        }

        listItem.innerHTML = citation;
        publicationList.appendChild(listItem);
    });
}

// Initial display (show all publications)
filterByType("all");
