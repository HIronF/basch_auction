from django.urls import path
from . import views

urlpatterns = [
    # Auction State & Lifecycle
    path("state/", views.get_state, name="get_state"),
    path("start/", views.start_auction, name="start_auction"),
    path("pause/", views.pause_auction, name="pause_auction"),
    path("resume/", views.resume_auction, name="resume_auction"),
    path("reset/", views.reset_auction, name="reset_auction"),

    # Players
    path("players/", views.players_list_create, name="players_list_create"),
    path("players/<int:id>/", views.player_detail, name="player_detail"),

    # Teams
    path("teams/", views.teams_list_create, name="teams_list_create"),
    path("teams/<int:id>/", views.team_detail, name="team_detail"),

    # Categories
    path("categories/", views.categories_list_create, name="categories_list_create"),
    path("categories/<int:id>/", views.category_detail, name="category_detail"),

    # Bidding & Actions
    path("bid/", views.place_bid, name="place_bid"),
    path("bump-bid/", views.bump_bid, name="bump_bid"),
    path("sell/", views.sell_player, name="sell_player"),
    path("unsold/", views.mark_unsold, name="mark_unsold"),
    path("undo-bid/", views.undo_bid, name="undo_bid"),
    path("undo-sold/", views.undo_sold, name="undo_sold"),
    path("assign-captains/", views.assign_captains, name="assign_captains"),

    # Settings
    path("settings/", views.settings_detail, name="settings_detail"),

    # Import / Export
    path("export/json/", views.export_json, name="export_json"),
    path("export/csv/", views.export_csv, name="export_csv"),
    path("import/json/", views.import_json, name="import_json"),
]
