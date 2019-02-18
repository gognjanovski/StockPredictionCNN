/*
    Build Convolutional Neural Network using Tensorflow.js
*/
const buildCnn = function (data) {
    return new Promise(function (resolve, reject) {

        // Linear (sequential) stack of layers
        const model = tf.sequential();

        // Define input layer
        model.add(tf.layers.inputLayer({
            inputShape: [7, 1],
        }));

        // Add the first convolutional layer
        model.add(tf.layers.conv1d({
            kernelSize: 2,
            filters: 128,
            strides: 1,
            use_bias: true,
            activation: 'relu',
            kernelInitializer: 'VarianceScaling'
        }));

        // Add the Average Pooling layer
        model.add(tf.layers.averagePooling1d({
            poolSize: [2],
            strides: [1]
        }));

        // Add the second convolutional layer
        model.add(tf.layers.conv1d({
            kernelSize: 2,
            filters: 64,
            strides: 1,
            use_bias: true,
            activation: 'relu',
            kernelInitializer: 'VarianceScaling'
        }));

        // Add the Average Pooling layer
        model.add(tf.layers.averagePooling1d({
            poolSize: [2],
            strides: [1]
        }));

        // Add Flatten layer, reshape input to (number of samples, number of features)
        model.add(tf.layers.flatten({

        }));

        // Add Dense layer, 
        model.add(tf.layers.dense({
            units: 1,
            kernelInitializer: 'VarianceScaling',
            activation: 'linear'
        }));

        return resolve({
            'model': model,
            'data': data
        });
    });
}



const cnn = function (model, data, epochs) {
    console.log("MODEL SUMMARY: ")
    model.summary();

    return new Promise(function (resolve, reject) {
        try {
            // Optimize using adam (adaptive moment estimation) algorithm
            model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });

            // Train the model
            model.fit(data.tensorTrainX, data.tensorTrainY, {
                epochs: epochs
            }).then(function (result) {
                /*for (let i = result.epoch.length-1; i < result.epoch.length; ++i) {
                    print("Loss after Epoch " + i + " : " + result.history.loss[i]);
                }*/
                print("Loss after last Epoch (" + result.epoch.length + ") is: " + result.history.loss[result.epoch.length-1]);
                resolve(model);
            })
        }
        catch (ex) {
            reject(ex);
        }
    });
}

let url = 'https://api.iextrading.com/1.0/stock/%company%/chart/1y'
let epochs = 100;
let timePortion = 7;

$(document).ready(function () {

    // Initialize the graph
    plotData([], []);

    $('#getCompany').click(function () {
        clearPrint();
        print("Beginning Stock Prediction ...");
        let company = $('#company').val().trim();
        
        $.getJSON(url.replace('%company%', company).toLowerCase()).then(function (data) {
            
            // Get the datetime labels use in graph
            let labels = data.map(function (val) { return val['date']; });
            
            // Process the data and create the train sets
            processData(data, timePortion).then(function (result) {
                
                // Crate the set for stock price prediction for the next day
                let nextDayPrediction = generateNextDayPrediction(result.originalData, result.timePortion);
                // Get the last date from the data set
                let predictDate = (new Date(labels[labels.length-1] + 'T00:00:00.000')).addDays(1);

                // Build the Convolutional Tensorflow model
                buildCnn(result).then(function (built) {
                    
                    // Transform the data to tensor data
                    // Reshape the data in neural network input format [number_of_samples, timePortion, 1];
                    let tensorData = {
                        tensorTrainX: tf.tensor1d(built.data.trainX).reshape([built.data.size, built.data.timePortion, 1]),
                        tensorTrainY: tf.tensor1d(built.data.trainY)
                    };
                    // Rember the min and max in order to revert (min-max scaler) the scaled data later 
                    let max = built.data.max;
                    let min = built.data.min;
                    
                    // Train the model using the tensor data
                    // Repeat multiple epochs so the error rate is smaller (better fit for the data)
                    cnn(built.model, tensorData, epochs).then(function (model) {
                        
                        // Predict for the same train data
                        // We gonna show the both (original, predicted) sets on the graph 
                        // so we can see how well our model fits the data
                        var predictedX = model.predict(tensorData.tensorTrainX);
                        
                        // Scale the next day features
                        let nextDayPredictionScaled = minMaxScaler(nextDayPrediction, min, max);
                        // Transform to tensor data
                        let tensorNextDayPrediction = tf.tensor1d(nextDayPredictionScaled.data).reshape([1, built.data.timePortion, 1]);
                        // Predict the next day stock price
                        let predictedValue = model.predict(tensorNextDayPrediction);
                        
                        // Get the predicted data for the train set
                        predictedValue.data().then(function (predValue) {
                            // Revert the scaled features, so we get the real values
                            let inversePredictedValue = minMaxInverseScaler(predValue, min, max);

                            // Get the next day predicted value
                            predictedX.data().then(function (pred) {
                                // Revert the scaled feature
                                var predictedXInverse = minMaxInverseScaler(pred, min, max);

                                // Convert Float32Array to regular Array, so we can add additional value
                                predictedXInverse.data = Array.prototype.slice.call(predictedXInverse.data);
                                // Add the next day predicted stock price so it's showed on the graph
                                predictedXInverse.data[predictedXInverse.data.length] = inversePredictedValue.data[0];
    
                                // Revert the scaled labels from the trainY (original), 
                                // so we can compare them with the predicted one
                                var trainYInverse = minMaxInverseScaler(built.data.trainY, min, max);

                                // Plot the original (trainY) and predicted values for the same features set (trainX)
                                plotData(trainYInverse.data, predictedXInverse.data, labels);
                            });

                            // Print the predicted stock price value for the next day
                            print("Predicted Stock Price of " + company + " for date " + moment(predictDate).format("DD-MM-YYYY") + " is: " + inversePredictedValue.data[0].toFixed(3) + "$");
                        });
                        
                    });
                    
                });
                
            });
            
        });
        
        
    });
});
    