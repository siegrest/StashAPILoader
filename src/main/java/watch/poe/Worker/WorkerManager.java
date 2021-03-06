package poe.Worker;

import com.typesafe.config.Config;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import poe.Database.Database;
import poe.Item.Parser.ItemParser;
import poe.Interval.TimeFrame;
import poe.Interval.IntervalManager;
import poe.League.LeagueManager;
import poe.Statistics.StatisticsManager;


import java.util.ArrayList;

/**
 * Manages worker objects (eg. distributing jobs, adding/removing workers)
 */
public class WorkerManager extends Thread {
    private static final Logger logger = LoggerFactory.getLogger(WorkerManager.class);

    private final Config config;
    private final Database database;
    private final LeagueManager leagueManager;
    private final StatisticsManager statisticsManager;
    private final ItemParser itemParser;
    private final IntervalManager intervalManager;

    private final ArrayList<Worker> workerList = new ArrayList<>();
    private volatile boolean flagRun = true;
    private volatile boolean readyToExit = false;

    private long lastPullTime;
    private String nextChangeID;
    private int jobCounter;

    public WorkerManager(Config cnf, IntervalManager se, Database db, StatisticsManager sm, LeagueManager lm, ItemParser ip) {
        this.statisticsManager = sm;
        this.leagueManager = lm;
        this.intervalManager = se;
        this.itemParser = ip;
        this.database = db;
        this.config = cnf;
    }

    /**
     * Contains main loop. Checks for open jobs and assigns them to workers
     */
    public void run() {
        logger.info("Starting WorkerManager");
        logger.info("Loaded params: [1m: {} sec][10m: {} min][60m: {} min][24h: {} h]",
                TimeFrame.M_1.getRemaining() / 1000,
                TimeFrame.M_10.getRemaining() / 60000,
                TimeFrame.M_60.getRemaining() / 60000,
                TimeFrame.H_24.getRemaining() / 3600000
        );

        while (flagRun) {
            intervalManager.checkFlagStates();

            // If cycle should be initiated
            if (intervalManager.isBool(TimeFrame.M_10)) {
                cycle();
            }

            // While there's a job that needs to be given out
            if (nextChangeID != null) {
                for (Worker worker : workerList) {
                    if (worker.getJob() != null) {
                        continue;
                    }

                    worker.setJob(++jobCounter, nextChangeID);
                    nextChangeID = null;
                }
            }

            intervalManager.resetFlags();

            try {
                Thread.sleep(100);
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
            }
        }

        // If main loop was interrupted, raise flag indicating program is ready to safely exit
        readyToExit = true;
    }

    /**
     * Minutely cycle init
     */
    private void cycle() {
        if (intervalManager.isBool(TimeFrame.H_24) && config.getBoolean("entry.removeOldEntries")) {
            database.history.removeOldItemEntries();
        }

        database.calc.calcExalted();

        if (intervalManager.isBool(TimeFrame.M_60)) {
            leagueManager.cycle();
            database.stats.countActiveAccounts(statisticsManager);
            database.calc.calcDaily();
            database.calc.calcTotal();
            database.calc.calcCurrent();
        }

        if (intervalManager.isBool(TimeFrame.H_24)) {
            database.history.addDaily();
            database.calc.calcSpark();
        }

        // Prepare cycle message
        logger.info(String.format("Status: [1m: %2d sec][10m: %2d min][60m: %2d min][24h: %2d h]",
                TimeFrame.M_1.getRemaining() / 1000 + 1,
                TimeFrame.M_10.getRemaining() / 60000 + 1,
                TimeFrame.M_60.getRemaining() / 60000 + 1,
                TimeFrame.H_24.getRemaining() / 3600000 + 1
        ));

        // Upload stats to database
        statisticsManager.upload();
    }

    /**
     * Stops all active Workers and this object's process
     */
    public void stopController() {
        logger.info("Stopping controller");

        flagRun = false;

        // Request worker shutdowns
        for (Worker worker : workerList) {
            logger.info(String.format("Stopping worker (%d)", worker.getWorkerId()));
            worker.requestStop();
        }

        // Wait until all are stopped
        while (true) {
            try {
                Thread.sleep(100);
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
            }

            boolean allStopped = true;
            for (Worker worker : workerList) {
                if (worker.isRunning()) {
                    allStopped = false;
                    break;
                }
            }

            if (allStopped) {
                break;
            }
        }

        // Wait until run() function is ready to exit
        while (!readyToExit) try {
            Thread.sleep(50);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
        }

        logger.info("Controller stopped");
    }

    /**
     * Prints out all active workers and their active jobs
     */
    public void printWorkers() {
        for (Worker worker : workerList) {
            logger.info(worker.toString());
        }
    }

    /**
     * Spawns new workers
     *
     * @param workerCount Amount of new workers to be added
     */
    public void spawnWorkers(int workerCount) {
        // Get the next available array index
        int nextWorkerIndex = workerList.size();

        // Loop through creation
        for (int i = nextWorkerIndex; i < nextWorkerIndex + workerCount; i++) {
            Worker worker = new Worker(i, this, statisticsManager, itemParser, database, config);
            worker.start();

            // Add worker to local list
            workerList.add(worker);
        }
    }

    /**
     * Removes active workers
     *
     * @param workerCount Amount of new workers to be removed
     */
    public void fireWorkers(int workerCount) {
        Worker lastWorker;

        // Get the last available index
        int lastWorkerIndex = workerList.size() - 1;

        // Can't remove what's not there
        if (lastWorkerIndex <= 0 || lastWorkerIndex - workerCount < 0) {
            logger.error("Not enough active workers");
            return;
        }

        // Loop through removal
        for (int i = lastWorkerIndex; i > lastWorkerIndex - workerCount; i--) {
            lastWorker = workerList.get(i);
            lastWorker.requestStop();
            workerList.remove(lastWorker);
        }
    }

    /**
     * Sets the next change ID in the variable. If the variable has no value, set it to the newChangeID's one,
     * otherwise compare the two and set the newest
     *
     * @param newChangeID Change ID to be added
     */
    public void setNextChangeID(String newChangeID) {
        if (nextChangeID == null) {
            nextChangeID = newChangeID;
        } else if (Integer.parseInt(newChangeID.substring(newChangeID.lastIndexOf('-') + 1)) >
                Integer.parseInt(nextChangeID.substring(nextChangeID.lastIndexOf('-') + 1))) {
            nextChangeID = newChangeID;
        }
    }

    /**
     * Pauses or resumes workers
     *
     * @param state True for pause
     * @param wait  True for waiting until paused
     */
    public void setWorkerSleepState(boolean state, boolean wait) {
        logger.info(state ? "Pausing all workers.." : "Resuming all workers..");

        for (Worker worker : workerList) {
            worker.setPause(state);
        }

        // User wants to wait until all workers are paused/resumed
        while (wait) {
            boolean tmp = false;

            // If there's at least 1 worker that doesn't match the state
            for (Worker worker : workerList) {
                if (worker.isPaused() != state) {
                    tmp = true;
                    break;
                }
            }

            if (!tmp) {
                break;
            }

            try {
                Thread.sleep(10);
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
            }
        }
    }


    public long getLastPullTime() {
        return lastPullTime;
    }

    public void setLastPullTime() {
        this.lastPullTime = System.currentTimeMillis();
    }
}
