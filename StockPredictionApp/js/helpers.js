/*
    Process the Finance API response (data)
    Create the train freatures and labels for cnn
    Each prediction is base on previous timePortion days
    ex. timePortion=7, prediction for the next day is based to values of the previous 7 days
*/
const processData = function (data, timePortion) {
    return new Promise(function (resolve, reject) {
        let trainX = [], trainY = [], size = data.length;

        let features = [];
        for (let i = 0; i < size; i++) {
            features.push(data[i]['close']);
        }

        // Scale the values
        var scaledData = minMaxScaler(features, getMin(features), getMax(features));
        let scaledFeatures = scaledData.data;
     
        try {
            // Create the train sets
            for (let i = timePortion; i < size; i++) {

                for (let j = (i - timePortion); j < i; j++) {
                    trainX.push(scaledFeatures[j]);
                }

                trainY.push(scaledFeatures[i]);
            }

        } catch (ex) {
            resolve(ex);
            console.log(ex);
        }

        return resolve({
            size: (size - timePortion),
            timePortion: timePortion,
            trainX: trainX,
            trainY: trainY,
            min: scaledData.min,
            max: scaledData.max,
            originalData: features,
        })
    });
};


/*
    This will take the last timePortion days from the data
    and they will be used to predict the next day stock price
*/
const generateNextDayPrediction = function (data, timePortion) {
    let size = data.length;
    let features = [];

    for (let i = (size - timePortion); i < size; i++) {
        features.push(data[i]);
    }
    
    return features;
}

/*
    Scaling feature using min-max normalization.
    All values will be between 0 and 1
*/
const minMaxScaler = function (data, min, max) {

    let scaledData = data.map(function (value) {
        return (value - min) / (max - min);
    });
    
    return {
        data: scaledData,
        min: min,
        max: max
    }
}


/*
    Revert min-max normalization and get the real values
*/
const minMaxInverseScaler = function (data, min, max) {

    let scaledData = data.map(function (value) {
        return value * (max - min) + min;
    });

    return {
        data: scaledData,
        min: min,
        max: max
    }
}


/*
    Get min value from array
*/
const getMin = function (data) {
    return Math.min(...data);
} 


/*
    Get max value from array
*/
const getMax = function (data) {
    return Math.max(...data);
} 


/*
    Adds days to given date
*/
Date.prototype.addDays = function(days) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
}


/*
    Add text in the html view
*/
const print = function (text) {
    let el = document.getElementsByClassName('cnn')[0];
    let elem = document.createElement('h5');
    elem.innerHTML = text;
    el.append(elem);
    el.append(document.createElement('br'))
    console.log(text)
};


/*
    Clear the html view
*/
const clearPrint = function () {
    let el = document.getElementsByClassName('cnn')[0];
    el.innerHTML = "";
}