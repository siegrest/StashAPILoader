package com.poestats.database;

import com.poestats.Config;
import com.poestats.Main;
import com.poestats.league.LeagueEntry;
import com.poestats.pricer.StatusElement;
import com.poestats.pricer.maps.CurrencyMap;
import com.poestats.relations.entries.SupIndexedItem;
import com.poestats.relations.entries.SubIndexedItem;

import java.sql.*;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class Database {
    //------------------------------------------------------------------------------------------------------------
    // Class variables
    //------------------------------------------------------------------------------------------------------------

    private Connection connection;
    private ArrayList<String> tables;

    //------------------------------------------------------------------------------------------------------------
    // Constructors
    //------------------------------------------------------------------------------------------------------------

    //------------------------------------------------------------------------------------------------------------
    // DB controllers
    //------------------------------------------------------------------------------------------------------------

    public void connect() {
        try {
            connection = DriverManager.getConnection(Config.db_address, Config.db_username, Config.getDb_password());
            connection.setCatalog(Config.db_database);
            connection.setAutoCommit(false);

            tables = listAllTables();
        } catch (SQLException ex) {
            ex.printStackTrace();
            Main.ADMIN.log_("Failed to connect to database", 5);
            System.exit(0);
        }
    }

    public void disconnect() {
        try {
            if (connection != null) connection.close();
        } catch (SQLException ex) {
            ex.printStackTrace();
        }
    }

    //------------------------------------------------------------------------------------------------------------
    // Initial DB setup
    //------------------------------------------------------------------------------------------------------------

    private ArrayList<String> listAllTables() throws SQLException {
        PreparedStatement statement = connection.prepareStatement("SHOW tables");
        ResultSet result = statement.executeQuery();

        ArrayList<String> tables = new ArrayList<>();

        while (result.next()) {
            tables.add(result.getString("Tables_in_" + Config.db_database));
        }

        return tables;
    }

    //------------------------------------------------------------------------------------------------------------
    // Access methods
    //------------------------------------------------------------------------------------------------------------

    public List<LeagueEntry> getLeagues() {
        try {
            PreparedStatement statement = connection.prepareStatement("SELECT * FROM `leagues`");
            ResultSet result = statement.executeQuery();

            List<LeagueEntry> leagueEntries = new ArrayList<>();

            while (result.next()) {
                LeagueEntry leagueEntry = new LeagueEntry();

                // TODO: SQL database has additional field display
                leagueEntry.setId(result.getString("id"));
                leagueEntry.setEndAt(result.getString("start"));
                leagueEntry.setStartAt(result.getString("end"));

                leagueEntries.add(leagueEntry);
            }

            return leagueEntries;
        } catch (SQLException ex) {
            ex.printStackTrace();
            Main.ADMIN.log_("Could not query database league list", 3);
            return null;
        }
    }

    /**
     * Compares provided league entries to ones present in database, updates any changes and adds missing leagues
     *
     * @param leagueEntries List of the most recent LeagueEntry objects
     */
    public void updateLeagues(List<LeagueEntry> leagueEntries) {
        if (leagueEntries == null) {
            Main.ADMIN.log_("Could not update database league list (null passed)", 3);
            return;
        }

        List<LeagueEntry> tmpLeagueEntries = new ArrayList<>(leagueEntries);

        try {
            String query1 = "SELECT * FROM `leagues`";
            String query2 = "UPDATE `leagues` SET `start`=?, `end`=? WHERE `id`=?";
            String query3 = "INSERT INTO `leagues` (`id`, `start`, `end`) VALUES (?, ?, ?)";

            PreparedStatement statement1 = connection.prepareStatement(query1);
            PreparedStatement statement2 = connection.prepareStatement(query2);
            PreparedStatement statement3 = connection.prepareStatement(query3);

            ResultSet result = statement1.executeQuery();

            // Loop though database's league entries
            while (result.next()) {
                // Loop though provided league entries
                for (int i = 0; i < tmpLeagueEntries.size(); i++) {
                    // If there's a match and the info has changed, update the database entry
                    if (result.getString("id").equals(tmpLeagueEntries.get(i).getId())) {
                        String start = result.getString("start");
                        String end = result.getString("end");

                        String startNew = tmpLeagueEntries.get(i).getStartAt();
                        String endNew = tmpLeagueEntries.get(i).getEndAt();

                        boolean update = false;

                        if (start == null) {
                            if (startNew != null) update = true;
                        } else if (!start.equals(startNew)) update = true;

                        if (end == null) {
                            if (endNew != null) update = true;
                        } else if (!end.equals(endNew)) update = true;

                        if (update) {
                            if (startNew == null) statement2.setNull(1, 0);
                            else statement2.setString(1, startNew);

                            if (endNew == null) statement2.setNull(2, 0);
                            else statement2.setString(2, endNew);

                            statement2.setString(3, tmpLeagueEntries.get(i).getId());
                            statement2.addBatch();
                        }

                        tmpLeagueEntries.remove(i);
                        break;
                    }
                }
            }

            // Loop though entries that were not present in the database
            for (LeagueEntry leagueEntry : tmpLeagueEntries) {
                statement3.setString(1, leagueEntry.getId());

                if (leagueEntry.getStartAt() == null) statement3.setNull(2, 0);
                else statement3.setString(2, leagueEntry.getStartAt());

                if (leagueEntry.getEndAt() == null) statement3.setNull(3, 0);
                else statement3.setString(3, leagueEntry.getEndAt());

                statement3.addBatch();
            }

            // Execute the batches
            statement2.executeBatch();
            statement3.executeBatch();

            // Commit changes
            connection.commit();
        } catch (SQLException ex) {
            ex.printStackTrace();
            Main.ADMIN.log_("Could not update database league list", 3);
        }
    }

    /**
     * Removes any previous and updates the changeID record in table `changeid`
     *
     * @param changeID New changeID string to store
     */
    public void updateChangeID(String changeID) {
        try {
            String query1 = "DELETE FROM `changeid`";
            String query2 = "INSERT INTO `changeid` (`changeid`) VALUES (?)";

            PreparedStatement statement1 = connection.prepareStatement(query1);
            PreparedStatement statement2 = connection.prepareStatement(query2);

            statement2.setString(1, changeID);

            statement1.execute();
            statement2.execute();

            connection.commit();
        } catch (SQLException ex) {
            ex.printStackTrace();
            Main.ADMIN.log_("Could not update database change id", 3);
        }
    }

    /**
     * Gets a list of parent and child categories and their display names from the database
     *
     * @return Map of categories or null on error
     */
    public Map<String, List<String>> getCategories() {
        Map<String, List<String>> categories = new HashMap<>();

        try {
            String query =  "SELECT " +
                                "`category_parent`.`parent`, " +
                                "`category_parent`.`display`, " +
                                "`category_child`.`child`, " +
                                "`category_child`.`display` " +
                            "FROM `category_child`" +
                                "JOIN `category_parent`" +
                                    "ON `category_child`.`parent` = `category_parent`.`parent`";
            PreparedStatement statement = connection.prepareStatement(query);
            ResultSet result = statement.executeQuery();

            // Get parent categories
            while (result.next()) {
                String parent = result.getString(1);
                String parentDisplay = result.getString(2);

                String child = result.getString(3);
                String childDisplay = result.getString(4);

                List<String> childCategories = categories.getOrDefault(parent, new ArrayList<>());
                childCategories.add(child);
                categories.putIfAbsent(parent, childCategories);
            }
        } catch (SQLException ex) {
            ex.printStackTrace();
            Main.ADMIN.log_("Could not query categories", 3);
            return null;
        }

        return categories;
    }

    //--------------------
    // Item data
    //--------------------

    /**
     * Get item data relations from database
     *
     * @return Map of indexed items or null on error
     */
    public Map<String, SupIndexedItem> getItemData() {
        Map<String, SupIndexedItem> relations = new HashMap<>();

        try {
            String query =  "SELECT " +
                                "`item_data_sup`.`sup`, " +
                                "`item_data_sup`.`parent`, " +
                                "`item_data_sup`.`child`, " +
                                "`item_data_sup`.`name`, " +
                                "`item_data_sup`.`type`, " +
                                "`item_data_sup`.`frame`, " +
                                "`item_data_sup`.`key`, " +

                                "`item_data_sub`.`sub`, " +
                                "`item_data_sub`.`tier`, " +
                                "`item_data_sub`.`lvl`, " +
                                "`item_data_sub`.`quality`, " +
                                "`item_data_sub`.`corrupted`, " +
                                "`item_data_sub`.`links`, " +
                                "`item_data_sub`.`var`, " +
                                "`item_data_sub`.`key`, " +
                                "`item_data_sub`.`icon` " +
                            "FROM `item_data_sub`" +
                                "JOIN `item_data_sup`" +
                                    "ON `item_data_sub`.`sup` = `item_data_sup`.`sup`";
            PreparedStatement statement = connection.prepareStatement(query);
            ResultSet result = statement.executeQuery();

            // Get parent categories
            while (result.next()) {
                String sup = result.getString(1);
                String sub = result.getString(8);

                String supKey = result.getString(7);
                String subKey = result.getString(15);

                String parent = result.getString(2);
                String child = result.getString(3);

                String name = result.getString(4);
                String type = result.getString(5);
                int frame = result.getInt(6);

                String tier = result.getString(9);
                String lvl = result.getString(10);
                String quality = result.getString(11);
                String corrupted = result.getString(12);
                String links = result.getString(13);
                String var = result.getString(14);
                String icon = result.getString(16);

                SupIndexedItem supIndexedItem = relations.getOrDefault(sup, new SupIndexedItem());

                if (!relations.containsKey(sup)) {
                    if (child != null)  supIndexedItem.setChild(child);
                    if (type != null)   supIndexedItem.setType(type);

                    supIndexedItem.setParent(parent);
                    supIndexedItem.setName(name);
                    supIndexedItem.setFrame(frame);
                    supIndexedItem.setKey(supKey);
                }

                SubIndexedItem subIndexedItem = new SubIndexedItem();
                if (tier != null)       subIndexedItem.setTier(tier);
                if (lvl != null)        subIndexedItem.setLvl(lvl);
                if (quality != null)    subIndexedItem.setQuality(quality);
                if (corrupted != null)  subIndexedItem.setCorrupted(corrupted);
                if (links != null)      subIndexedItem.setLinks(links);
                if (var != null)        subIndexedItem.setVar(var);
                subIndexedItem.setKey(subKey);
                subIndexedItem.setIcon(icon);
                subIndexedItem.setSupIndexedItem(supIndexedItem);

                supIndexedItem.getSubIndexes().put(sub, subIndexedItem);
                relations.putIfAbsent(sup, supIndexedItem);
            }
        } catch (SQLException ex) {
            ex.printStackTrace();
            Main.ADMIN.log_("Could not query item data", 3);
            return null;
        }

        return relations;
    }

    public boolean addFullItemData(SupIndexedItem supIndexedItem, String sup, String sub) {
        try {
            String querySup =   "INSERT INTO " +
                                    "`item_data_sup` (`sup`,`parent`,`child`,`name`,`type`,`frame`,`key`) " +
                                "VALUES (?, ?, ?, ?, ?, ?, ?)";
            PreparedStatement statementSup = connection.prepareStatement(querySup);

            statementSup.setString(1, sup);
            statementSup.setString(2, supIndexedItem.getParent());
            statementSup.setString(3, supIndexedItem.getChild());
            statementSup.setString(4, supIndexedItem.getName());
            statementSup.setString(5, supIndexedItem.getType());
            statementSup.setInt(6, supIndexedItem.getFrame());
            statementSup.setString(7, supIndexedItem.getKey());

            statementSup.execute();

            addSubItemData(supIndexedItem, sup, sub);

            // Commit changes
            connection.commit();
            return true;
        } catch (SQLException ex) {
            ex.printStackTrace();
            Main.ADMIN.log_("Could not update item data in database", 3);
            return false;
        }
    }

    public boolean addSubItemData(SupIndexedItem supIndexedItem, String sup, String sub) {
        SubIndexedItem subIndexedItem = supIndexedItem.getSubIndexes().get(sup + sub);

        try {
            String query =  "INSERT INTO `item_data_sub` " +
                                "(`sup`,`sub`,`tier`,`lvl`,`quality`,`corrupted`,`links`,`var`,`key`,`icon`) " +
                            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            PreparedStatement statement = connection.prepareStatement(query);

            statement.setString(1, sup);
            statement.setString(2, sub);

            statement.setString(3, subIndexedItem.getTier());
            statement.setString(4, subIndexedItem.getLvl());
            statement.setString(5, subIndexedItem.getQuality());
            statement.setString(6, subIndexedItem.getCorrupted());
            statement.setString(7, subIndexedItem.getLinks());
            statement.setString(8, subIndexedItem.getVar());

            statement.setString(9, subIndexedItem.getKey());
            statement.setString(10, subIndexedItem.getIcon());

            statement.execute();

            // Commit changes
            connection.commit();
            return true;
        } catch (SQLException ex) {
            ex.printStackTrace();
            Main.ADMIN.log_("Could not update item data in database", 3);
            return false;
        }
    }

    //--------------------
    // Status
    //--------------------

    /**
     * Queries status timers from the database
     *
     * @param statusElement StatusElement to fill out
     * @return True if successful
     */
    public boolean getStatus(StatusElement statusElement) {
        try {
            PreparedStatement statement = connection.prepareStatement("SELECT * FROM `status`");
            ResultSet result = statement.executeQuery();

            while (result.next()) {
                switch (result.getString("name")) {
                    case "twentyFourCounter":
                        statusElement.twentyFourCounter = result.getLong("val");
                        break;
                    case "sixtyCounter":
                        statusElement.sixtyCounter = result.getLong("val");
                        break;
                    case "tenCounter":
                        statusElement.tenCounter = result.getLong("val");
                        break;
                }
            }

            return true;
        } catch (SQLException ex) {
            ex.printStackTrace();
            return false;
        }
    }

    /**
     * Removes any previous and updates the status records in table `status`
     *
     * @param statusElement StatusElement to copy
     * @return True on success
     */
    public boolean updateStatus(StatusElement statusElement) {
        try {
            String query1 = "DELETE FROM `status`";
            String query2 = "INSERT INTO `status` (`val`, `name`) VALUES (?, ?)";

            PreparedStatement statement1 = connection.prepareStatement(query1);
            PreparedStatement statement2 = connection.prepareStatement(query2);

            statement2.setLong(1, statusElement.twentyFourCounter);
            statement2.setString(2, "twentyFourCounter");
            statement2.addBatch();

            statement2.setLong(1, statusElement.sixtyCounter);
            statement2.setString(2, "sixtyCounter");
            statement2.addBatch();

            statement2.setLong(1, statusElement.tenCounter);
            statement2.setString(2, "tenCounter");
            statement2.addBatch();

            statement2.setLong(1, statusElement.lastRunTime);
            statement2.setString(2, "lastRunTime");
            statement2.addBatch();

            statement1.execute();
            statement2.executeBatch();
            connection.commit();

            return true;
        } catch (SQLException ex) {
            ex.printStackTrace();
            return false;
        }
    }

    //--------------------
    // Entry management
    //--------------------

    public boolean getCurrency(String league, CurrencyMap currencyMap) {
        if (!tables.contains(league)) return false;

        String table = "league_" + league.toLowerCase() + "_item";

        try {
            String query =  "SELECT " +
                            "    i.`sub`," +
                            "    i.`sub`," +
                            "    d.`name`," +
                            "    i.`mean`," +
                            "    i.`median`," +
                            "    i.`mode`," +
                            "    i.`exalted`," +
                            "    i.`count`," +
                            "    i.`quantity`," +
                            "    i.`inc`," +
                            "    i.`dec`" +
                            "FROM `"+ table +"` AS i" +
                            "    INNER JOIN `item_data_sup` AS d" +
                            "        ON i.`sup` = d.`sup`" +
                            "WHERE EXISTS (" +
                            "    SELECT * FROM `item_data_sup` AS a " +
                            "    WHERE a.`sup` = i.`sup` " +
                            "    AND a.`parent` = 'currency'" +
                            "    AND a.`frame` = 5)";
            PreparedStatement statement = connection.prepareStatement(query);
            ResultSet result = statement.executeQuery();

            while (result.next()) {
                String name = result.getString("name");

                String sup = result.getString("sup");
                String sub = result.getString("sub");

                DatabaseItem databaseItem = new DatabaseItem(sup, sub);
                databaseItem.loadItem(result);
                currencyMap.put(name, databaseItem);
            }

            return true;
        } catch (SQLException ex) {
            ex.printStackTrace();
            return false;
        }
    }

    public DatabaseItem getFullItem(String index, String league) {
        try {
            String sup = index.substring(0, Config.index_superSize);
            String sub = index.substring(Config.index_superSize);

            String tableItem = "league_" + league.toLowerCase() + "_item";
            String tableEntry = "league_" + league.toLowerCase() + "_entry";

            String queryItem = "SELECT * FROM `"+ tableItem +"` WHERE `sup`='"+ sup +"' AND `sub`='"+ sub +"'";
            String queryEntry = "SELECT * FROM `"+ tableEntry +"` WHERE `sup`='"+ sup +"' AND `sub`='"+ sub +"'";

            PreparedStatement statementItem = connection.prepareStatement(queryItem);
            ResultSet resultItem = statementItem.executeQuery();

            DatabaseItem databaseItem = new DatabaseItem(sup, sub);

            if (resultItem.next()) {
                databaseItem.loadItem(resultItem);

                PreparedStatement statementEntry = connection.prepareStatement(queryEntry);
                ResultSet resultEntry = statementEntry.executeQuery();

                databaseItem.loadEntries(resultEntry);
            }

            return databaseItem;
        } catch (SQLException ex) {
            ex.printStackTrace();
            return null;
        }
    }

    public boolean updateFullItem(String league, DatabaseItem databaseItem) {
        String table1 = "league_" + league.toLowerCase() + "_item";
        String table2 = "league_" + league.toLowerCase() + "_entry";

        String query1 = "UPDATE `"+ table1 +"` " +
                            "SET `mean`=?,`median`=?,`mode`=?,`exalted`=?,`count`=?,`quantity`=?,`inc`=?,`dec`=? " +
                        "WHERE `sup`=? AND `sub`=?";

        String query2 = "INSERT INTO `"+ table1 +"` " +
                            "(`sup`,`sub`,`mean`,`median`,`mode`,`exalted`,`count`,`quantity`,`inc`,`dec`)" +
                            "VALUES (?,?,?,?,?,?,?,?,?,?)";

        String query3 = "DELETE FROM `"+ table2 +"` " +
                        "WHERE `sup`=? AND `sub`=? AND `id`=?";

        String query4 = "INSERT INTO `"+ table2 +"` " +
                            "(`sup`,`sub`,`price`,`account`,`id`)" +
                            "VALUES (?,?,?,?,?)";

        try {
            if (databaseItem.isInDatabase()) {
                PreparedStatement statement1 = connection.prepareStatement(query1);
                statement1.setDouble(1, databaseItem.getMean());
                statement1.setDouble(2, databaseItem.getMedian());
                statement1.setDouble(3, databaseItem.getMode());
                statement1.setDouble(4, databaseItem.getExalted());
                statement1.setInt(5, databaseItem.getCount());
                statement1.setInt(6, databaseItem.getQuantity());
                statement1.setInt(7, databaseItem.getInc());
                statement1.setInt(8, databaseItem.getDec());

                statement1.setString(9, databaseItem.getSup());
                statement1.setString(10, databaseItem.getSub());
                statement1.execute();
            } else {
                PreparedStatement statement2 = connection.prepareStatement(query2);
                statement2.setString(1, databaseItem.getSup());
                statement2.setString(2, databaseItem.getSub());
                statement2.setDouble(3, databaseItem.getMean());
                statement2.setDouble(4, databaseItem.getMedian());
                statement2.setDouble(5, databaseItem.getMode());
                statement2.setDouble(6, databaseItem.getExalted());

                statement2.setInt(7, databaseItem.getCount());
                statement2.setInt(8, databaseItem.getQuantity());
                statement2.setInt(9, databaseItem.getInc());
                statement2.setInt(10, databaseItem.getDec());
                statement2.execute();
            }

            PreparedStatement statement3 = connection.prepareStatement(query3);
            for (DatabaseEntry databaseEntry : databaseItem.getDatabaseEntryListToRemove()) {
                statement3.setString(1, databaseItem.getSup());
                statement3.setString(2, databaseItem.getSub());
                statement3.setString(3, databaseEntry.getId());
                statement3.addBatch();
            }
            statement3.executeBatch();

            PreparedStatement statement4 = connection.prepareStatement(query4);
            for (DatabaseEntry databaseEntry : databaseItem.getDatabaseEntryListToAdd()) {
                statement4.setString(1, databaseItem.getSup());
                statement4.setString(2, databaseItem.getSub());
                statement4.setString(3, databaseEntry.getPriceAsRoundedString());
                statement4.setString(4, databaseEntry.getAccount());
                statement4.setString(5, databaseEntry.getId());
                statement4.addBatch();
            }
            statement4.executeBatch();

            connection.commit();
            return true;
        } catch (SQLException ex) {
            ex.printStackTrace();
            return false;
        }
    }

    //--------------------------
    // History entry management
    //--------------------------

    public boolean addMinutely(String league) {
        league = league.toLowerCase();

        try {
            String query =  "INSERT INTO `league_"+ league +"_history_entry` " +
                            "    (`sup`,`sub`,`type`,`mean`,`median`,`mode`,`count`,`quantity`)" +
                            "SELECT " +
                            "    `sup`,`sub`,'minutely',`mean`,`median`,`mode`,`count`,`quantity`" +
                            "FROM `league_"+ league +"_item`";
            PreparedStatement statement = connection.prepareStatement(query);
            statement.execute();

            return true;
        } catch (SQLException ex) {
            ex.printStackTrace();
            return false;
        }
    }

    public boolean removeOldHistoryEntries(String league) {
        try {
            String query =  "DELETE FROM `league_"+ league.toLowerCase() +"_history_entry` " +
                            "WHERE `time` < ADDDATE(NOW(), INTERVAL -1 HOUR)";
            PreparedStatement statement = connection.prepareStatement(query);
            statement.execute();

            return true;
        } catch (SQLException ex) {
            ex.printStackTrace();
            return false;
        }
    }

    public boolean createLeagueTables(String league) {
        league = league.toLowerCase();

        try {
            tables = listAllTables();

            String table1 = "league_"+ league +"_item";
            String table2 = "league_"+ league +"_history";
            String table3 = "league_"+ league +"_entry";
            String table4 = "league_"+ league +"_history_entry";

            String query1 = "CREATE TABLE `"+ table1 +"` (" +
                            "    CONSTRAINT `"+ league +"_sup-sub`" +
                            "        FOREIGN KEY (`sup`,`sub`) " +
                            "        REFERENCES `item_data_sub` (`sup`,`sub`)" +
                            "        ON DELETE CASCADE," +

                            "    `sup`       varchar(5)      NOT NULL," +
                            "    `sub`       varchar(2)      NOT NULL," +

                            "    `time`      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP," +
                            "    `mean`      decimal(10,4)   unsigned NOT NULL DEFAULT 0.0," +
                            "    `median`    decimal(10,4)   unsigned NOT NULL DEFAULT 0.0," +
                            "    `mode`      decimal(10,4)   unsigned NOT NULL DEFAULT 0.0," +
                            "    `exalted`   decimal(10,4)   unsigned NOT NULL DEFAULT 0.0," +
                            "    `count`     int(16)         unsigned NOT NULL DEFAULT 0," +
                            "    `quantity`  int(8)          unsigned NOT NULL DEFAULT 0," +
                            "    `inc`       int(8)          unsigned NOT NULL DEFAULT 0," +
                            "    `dec`       int(8)          unsigned NOT NULL DEFAULT 0" +
                            ") ENGINE=InnoDB DEFAULT CHARSET=utf8;";

            String query2 = "CREATE TABLE `"+ table2 +"` (" +
                            "    CONSTRAINT `"+ league +"_history`" +
                            "        FOREIGN KEY (`sup`,`sub`)" +
                            "        REFERENCES `"+ table1 +"` (`sup`,`sub`)" +
                            "        ON DELETE CASCADE," +

                            "    `sup`       varchar(5)      NOT NULL," +
                            "    `sub`       varchar(2)      NOT NULL," +

                            "    `time`      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP," +
                            "    `mean`      decimal(10,4)   unsigned DEFAULT NULL," +
                            "    `median`    decimal(10,4)   unsigned DEFAULT NULL," +
                            "    `mode`      decimal(10,4)   unsigned DEFAULT NULL," +
                            "    `count`     int(16)         unsigned DEFAULT NULL," +
                            "    `quantity`  int(8)          unsigned DEFAULT NULL" +
                            ") ENGINE=InnoDB DEFAULT CHARSET=utf8;";

            String query3 = "CREATE TABLE `"+ table3 +"` (" +
                            "    CONSTRAINT `"+ league +"_item_entry`" +
                            "        FOREIGN KEY (`sup`,`sub`)" +
                            "        REFERENCES `"+ table1 +"` (`sup`,`sub`)" +
                            "        ON DELETE CASCADE," +

                            "    `sup`       varchar(5)      NOT NULL," +
                            "    `sub`       varchar(2)      NOT NULL," +

                            "    `time`      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP," +
                            "    `price`     decimal(10,4)   NOT NULL," +
                            "    `account`   varchar(32)     NOT NULL," +
                            "    `id`        varchar(32)     NOT NULL" +
                            ") ENGINE=InnoDB DEFAULT CHARSET=utf8;";

            String query4 = "CREATE TABLE `"+ table4 +"` (" +
                            "    CONSTRAINT `"+ league +"_history_entry`" +
                            "        FOREIGN KEY (`sup`,`sub`)" +
                            "        REFERENCES `"+ table1 +"` (`sup`,`sub`)" +
                            "        ON DELETE CASCADE," +
                            "    FOREIGN KEY (`type`)" +
                            "        REFERENCES `history_entry_category` (`type`)" +
                            "        ON DELETE CASCADE," +

                            "    `sup`       varchar(5)      NOT NULL," +
                            "    `sub`       varchar(2)      NOT NULL," +
                            "    `type`      varchar(32)     NOT NULL," +

                            "    `time`      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP," +
                            "    `mean`      decimal(10,4)   unsigned DEFAULT NULL," +
                            "    `median`    decimal(10,4)   unsigned DEFAULT NULL," +
                            "    `mode`      decimal(10,4)   unsigned DEFAULT NULL," +
                            "    `count`     int(16)         unsigned DEFAULT NULL," +
                            "    `quantity`  int(8)          unsigned DEFAULT NULL" +
                            ") ENGINE=InnoDB DEFAULT CHARSET=utf8;";

            if (!tables.contains(table1)) {
                PreparedStatement preparedStatement1 = connection.prepareStatement(query1);
                preparedStatement1.execute();
            }

            if (!tables.contains(table2)) {
                PreparedStatement preparedStatement2 = connection.prepareStatement(query2);
                preparedStatement2.execute();
            }

            if (!tables.contains(table3)) {
                PreparedStatement preparedStatement3 = connection.prepareStatement(query3);
                preparedStatement3.execute();
            }

            if (!tables.contains(table4)) {
                PreparedStatement preparedStatement4 = connection.prepareStatement(query4);
                preparedStatement4.execute();
            }

            connection.commit();
            return true;
        } catch (SQLException ex) {
            ex.printStackTrace();
            return false;
        }
    }

    //------------------------------------------------------------------------------------------------------------
    // Utility methods
    //------------------------------------------------------------------------------------------------------------

    private static void debug(ResultSet rs) throws SQLException {
        ResultSetMetaData rsmd = rs.getMetaData();
        int columnsNumber = rsmd.getColumnCount();
        while (rs.next()) {
            for (int i = 1; i <= columnsNumber; i++) {
                if (i > 1) System.out.print(",  ");
                String columnValue = rs.getString(i);
                System.out.print(columnValue + " (" + rsmd.getColumnName(i) + ")");
            }
            System.out.println();
        }
    }

    //------------------------------------------------------------------------------------------------------------
    // Getters
    //------------------------------------------------------------------------------------------------------------

    //------------------------------------------------------------------------------------------------------------
    // Setters
    //------------------------------------------------------------------------------------------------------------
}
