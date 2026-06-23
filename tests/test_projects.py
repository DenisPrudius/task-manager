PROJECT = {"name": "My Project", "description": "Test project"}


def test_create_project(auth_client):
    r = auth_client.post("/projects/", json=PROJECT)
    assert r.status_code == 201
    assert r.json()["name"] == PROJECT["name"]


def test_list_projects(auth_client):
    auth_client.post("/projects/", json=PROJECT)
    auth_client.post("/projects/", json={"name": "Second"})
    r = auth_client.get("/projects/")
    assert r.status_code == 200
    assert len(r.json()) == 2


def test_get_project(auth_client):
    project_id = auth_client.post("/projects/", json=PROJECT).json()["id"]
    r = auth_client.get(f"/projects/{project_id}")
    assert r.status_code == 200
    assert r.json()["id"] == project_id


def test_get_project_not_found(auth_client):
    r = auth_client.get("/projects/99999")
    assert r.status_code == 404


def test_update_project(auth_client):
    project_id = auth_client.post("/projects/", json=PROJECT).json()["id"]
    r = auth_client.patch(f"/projects/{project_id}", json={"name": "Renamed"})
    assert r.status_code == 200
    assert r.json()["name"] == "Renamed"


def test_delete_project(auth_client):
    project_id = auth_client.post("/projects/", json=PROJECT).json()["id"]
    r = auth_client.delete(f"/projects/{project_id}")
    assert r.status_code == 204
    assert auth_client.get(f"/projects/{project_id}").status_code == 404


def test_update_project_forbidden(client):
    # Register two users and ensure they can't edit each other's projects
    client.post(
        "/users/register",
        json={"email": "owner@test.com", "username": "owner", "password": "pass123"},
    )
    client.post(
        "/users/register",
        json={"email": "other@test.com", "username": "other", "password": "pass123"},
    )
    owner_token = client.post(
        "/users/login", data={"username": "owner", "password": "pass123"}
    ).json()["access_token"]
    other_token = client.post(
        "/users/login", data={"username": "other", "password": "pass123"}
    ).json()["access_token"]

    project_id = client.post(
        "/projects/",
        json=PROJECT,
        headers={"Authorization": f"Bearer {owner_token}"},
    ).json()["id"]

    r = client.patch(
        f"/projects/{project_id}",
        json={"name": "Hacked"},
        headers={"Authorization": f"Bearer {other_token}"},
    )
    assert r.status_code == 403
