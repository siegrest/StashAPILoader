package com.poestats.League;


import com.poestats.Config;
import com.poestats.Main;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

public class LeagueEntry {
    //------------------------------------------------------------------------------------------------------------
    // Class variables
    //------------------------------------------------------------------------------------------------------------

    private String id, startAt, endAt;

    //------------------------------------------------------------------------------------------------------------
    // Main methods
    //------------------------------------------------------------------------------------------------------------

    /**
     * Finds number of days league has been active for
     *
     * @return Current league length or 0 on error
     */
    public int getElapsedDays() {
        Date startDate = startAt == null ? null : parseDate(startAt);
        Date currentDate = new Date();

        if (startDate == null) {
            return 0;
        } else {
            long startDifference = Math.abs(currentDate.getTime() - startDate.getTime());
            return (int)(startDifference / Config.league_millisecondsInDay);
        }
    }

    /**
     * Finds total days league will elapse
     *
     * @return Total league length or -1 on error
     */
    public int getTotalDays() {
        Date startDate = startAt == null ? null : parseDate(startAt);
        Date endDate = endAt == null ? null : parseDate(endAt);

        if (startDate == null || endDate == null) {
            return  -1;
        } else {
            long totalDifference = Math.abs(endDate.getTime() - startDate.getTime());
            return (int) (totalDifference / Config.league_millisecondsInDay);
        }
    }


    //------------------------------------------------------------------------------------------------------------
    // Utility methods
    //------------------------------------------------------------------------------------------------------------

    /**
     * Converts string date found in league api to Date object
     *
     * @param date ISO 8601 standard yyyy-MM-dd'T'HH:mm:ss'Z' date
     * @return Created Date object
     */
    private Date parseDate(String date) {
        SimpleDateFormat format = new SimpleDateFormat(Config.league_timeFormat, Locale.getDefault());
        format.setTimeZone(TimeZone.getTimeZone("UTC"));

        try {
            return format.parse(date);
        } catch (ParseException ex) {
            Main.ADMIN._log(ex, 3);
        }

        return null;
    }

    //------------------------------------------------------------------------------------------------------------
    // Getters and setters
    //------------------------------------------------------------------------------------------------------------

    public String getId() {
        return id;
    }
}